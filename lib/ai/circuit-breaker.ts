import { env } from "@/config/env";
import {
  type AIProviderName,
  type ProviderCircuit,
  type ProviderCircuitState,
  AIProviderError,
} from "./types";

export interface CircuitCheckResult {
  eligible: boolean;
  isProbe?: boolean;
  reason?: "COOLDOWN" | "HALF_OPEN_IN_FLIGHT";
  cooldownRemainingMs?: number;
}

export class ProviderCircuitBreaker {
  private circuits = new Map<AIProviderName, ProviderCircuit>();
  private failureThreshold: number;

  constructor(options?: { failureThreshold?: number }) {
    this.failureThreshold =
      options?.failureThreshold ?? env.AI_FAILURE_THRESHOLD ?? 1;
    this.initProvider("gemini");
    this.initProvider("groq");
    this.initProvider("openrouter");
  }

  private initProvider(name: AIProviderName): ProviderCircuit {
    let circuit = this.circuits.get(name);
    if (!circuit) {
      circuit = {
        state: "CLOSED",
        consecutiveFailures: 0,
        halfOpenInFlight: false,
      };
      this.circuits.set(name, circuit);
    }
    return circuit;
  }

  /**
   * Calculates the cooldown duration based on error code or provider Retry-After
   */
  public calculateCooldown(error: AIProviderError): number {
    if (error.retryAfterMs && error.retryAfterMs > 0) {
      return error.retryAfterMs;
    }

    switch (error.code) {
      case "RATE_LIMITED":
        return env.AI_RATE_LIMIT_COOLDOWN_MS ?? 60000;
      case "TIMEOUT":
        return env.AI_TIMEOUT_COOLDOWN_MS ?? 30000;
      case "PROVIDER_ERROR":
        return env.AI_PROVIDER_ERROR_COOLDOWN_MS ?? 30000;
      case "NETWORK_ERROR":
        return env.AI_NETWORK_ERROR_COOLDOWN_MS ?? 30000;
      case "INVALID_STRUCTURED_OUTPUT":
        return env.AI_INVALID_OUTPUT_COOLDOWN_MS ?? 30000;
      case "AUTHENTICATION_ERROR":
        return env.AI_AUTH_ERROR_COOLDOWN_MS ?? 600000;
      case "CONFIGURATION_ERROR":
        return env.AI_CONFIG_ERROR_COOLDOWN_MS ?? 600000;
      default:
        return env.AI_PROVIDER_COOLDOWN_MS ?? 60000;
    }
  }

  /**
   * Evaluates if a provider is eligible to handle a request
   */
  public isEligible(
    provider: AIProviderName,
    now = Date.now(),
  ): CircuitCheckResult {
    const circuit = this.initProvider(provider);

    if (circuit.state === "CLOSED") {
      return { eligible: true };
    }

    if (circuit.state === "OPEN") {
      const cooldownUntil = circuit.cooldownUntil ?? 0;
      if (now < cooldownUntil) {
        return {
          eligible: false,
          reason: "COOLDOWN",
          cooldownRemainingMs: Math.max(0, cooldownUntil - now),
        };
      }

      // Cooldown has expired: transition to HALF_OPEN
      circuit.state = "HALF_OPEN";
      circuit.halfOpenInFlight = false;
    }

    if (circuit.state === "HALF_OPEN") {
      // Concurrency lock: Only exactly one in-flight probe allowed
      if (circuit.halfOpenInFlight) {
        return {
          eligible: false,
          reason: "HALF_OPEN_IN_FLIGHT",
          cooldownRemainingMs: 0,
        };
      }

      circuit.halfOpenInFlight = true;
      return {
        eligible: true,
        isProbe: true,
      };
    }

    return { eligible: true };
  }

  /**
   * Records successful response from a provider
   */
  public recordSuccess(provider: AIProviderName): void {
    const circuit = this.initProvider(provider);
    circuit.state = "CLOSED";
    circuit.consecutiveFailures = 0;
    circuit.halfOpenInFlight = false;
    circuit.openedAt = undefined;
    circuit.cooldownUntil = undefined;
    circuit.lastFailureCode = undefined;
  }

  /**
   * Records failure from a provider and updates circuit state
   */
  public recordFailure(
    provider: AIProviderName,
    error: AIProviderError,
    now = Date.now(),
  ): {
    circuitChanged: boolean;
    newState: ProviderCircuitState;
    cooldownMs: number;
  } {
    const circuit = this.initProvider(provider);
    circuit.consecutiveFailures += 1;
    circuit.lastFailureCode = error.code;
    circuit.lastFailureAt = now;
    circuit.halfOpenInFlight = false;

    const cooldownMs = this.calculateCooldown(error);
    const prevState = circuit.state;

    // Fast-trip on RATE_LIMITED, AUTHENTICATION_ERROR, CONFIGURATION_ERROR or if consecutive failures >= threshold or was HALF_OPEN
    const shouldTrip =
      error.code === "RATE_LIMITED" ||
      error.code === "AUTHENTICATION_ERROR" ||
      error.code === "CONFIGURATION_ERROR" ||
      prevState === "HALF_OPEN" ||
      circuit.consecutiveFailures >= this.failureThreshold;

    if (shouldTrip) {
      circuit.state = "OPEN";
      circuit.openedAt = now;
      circuit.cooldownUntil = now + cooldownMs;
    }

    return {
      circuitChanged: circuit.state !== prevState,
      newState: circuit.state,
      cooldownMs,
    };
  }

  /**
   * Releases probe lock without recording failure if probe request was cancelled externally
   */
  public releaseProbeLock(provider: AIProviderName): void {
    const circuit = this.circuits.get(provider);
    if (circuit && circuit.state === "HALF_OPEN") {
      circuit.halfOpenInFlight = false;
    }
  }

  /**
   * Gets circuit status for a provider
   */
  public getState(
    provider: AIProviderName,
    now = Date.now(),
  ): ProviderCircuit & { cooldownRemainingMs: number } {
    const circuit = this.initProvider(provider);
    let effectiveState = circuit.state;

    if (
      circuit.state === "OPEN" &&
      circuit.cooldownUntil &&
      now >= circuit.cooldownUntil
    ) {
      effectiveState = "HALF_OPEN";
    }

    const cooldownRemainingMs =
      effectiveState === "OPEN" && circuit.cooldownUntil
        ? Math.max(0, circuit.cooldownUntil - now)
        : 0;

    return {
      ...circuit,
      state: effectiveState,
      cooldownRemainingMs,
    };
  }

  /**
   * Gets status of all circuits
   */
  public getAllCircuits(
    now = Date.now(),
  ): Record<AIProviderName, ProviderCircuit & { cooldownRemainingMs: number }> {
    return {
      gemini: this.getState("gemini", now),
      groq: this.getState("groq", now),
      openrouter: this.getState("openrouter", now),
    };
  }

  /**
   * Resets circuit state for testing or manual maintenance
   */
  public reset(provider?: AIProviderName): void {
    if (provider) {
      this.circuits.set(provider, {
        state: "CLOSED",
        consecutiveFailures: 0,
        halfOpenInFlight: false,
      });
    } else {
      this.circuits.clear();
      this.initProvider("gemini");
      this.initProvider("groq");
      this.initProvider("openrouter");
    }
  }

  /**
   * For testing: manually set circuit state
   */
  public setCircuitState(
    provider: AIProviderName,
    state: ProviderCircuitState,
    cooldownUntil?: number,
  ): void {
    const circuit = this.initProvider(provider);
    circuit.state = state;
    circuit.cooldownUntil = cooldownUntil;
    circuit.halfOpenInFlight = false;
    if (state === "OPEN" && !cooldownUntil) {
      circuit.cooldownUntil = Date.now() + 60000;
    }
  }
}
