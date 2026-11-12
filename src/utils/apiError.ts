import type { AxiosError } from "axios";
import type { ApiResponse } from "../types";

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown>;
  statusCode?: number;
  requestId?: string;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
    statusCode?: number,
    requestId?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }

  static fromAxiosError(error: AxiosError<ApiResponse>): ApiError {
    const response = error.response;
    const data = response?.data;

    // Check if response has error object
    if (data?.error) {
      const errorData = data.error;
      const details = errorData.details as Record<string, unknown> | undefined;

      // Extract specific error message from details if available
      let message = errorData.message || "An error occurred";

      // Check for specific error details
      if (details?.details && typeof details.details === "string") {
        message = details.details;
      }

      return new ApiError(
        message,
        errorData.code || "UNKNOWN_ERROR",
        details,
        response?.status,
        data.request_id
      );
    }

    // Fallback to generic error
    return new ApiError(
      data?.message || error.message || "An unexpected error occurred",
      data?.error_code || "UNKNOWN_ERROR",
      undefined,
      response?.status,
      data?.request_id
    );
  }

  // Get user-friendly error message based on error code
  getUserFriendlyMessage(): string {
    switch (this.code) {
      case "LOGIN_FAILED":
        // Check if it's an email not found error
        if (this.details?.details === "The selected email is invalid.") {
          return "The email address you entered is not registered. Please check your email or sign up for a new account.";
        }
        return (
          this.message ||
          "Login failed. Please check your credentials and try again."
        );

      case "INVALID_CREDENTIALS":
        return "The email/phone or password you entered is incorrect. Please try again or reset your password if you've forgotten it.";

      case "TOKEN_EXPIRED":
        return "Your session has expired. Please log in again.";

      case "TOKEN_INVALID":
        return "Your session is invalid. Please log in again.";

      case "USER_SUSPENDED":
        return "Your account has been suspended. Please contact support for assistance.";

      case "RATE_LIMIT_EXCEEDED":
        return "Too many login attempts. Please wait a few minutes before trying again.";

      case "VALIDATION_ERROR":
        return this.message || "Please check your input and try again.";

      case "PAYMENT_UNAVAILABLE":
        return "Payment is temporarily unavailable. Please try again shortly.";

      case "PRICING_UNAVAILABLE":
        return "This course's pricing needs to be fixed by an admin — please try again later.";

      case "ENROLLMENT_IN_PROGRESS":
        return "Your enrollment is already being processed — please wait a moment.";

      case "ALREADY_ENROLLED":
        return "You're already enrolled in this course.";

      case "BELOW_MINIMUM_EXCHANGE": {
        const min = this.details?.min_exchange_coins;
        return min
          ? `You need at least ${min} Coins to request an exchange.`
          : "That's below the minimum amount you can exchange.";
      }

      case "INSUFFICIENT_COINS": {
        const available = this.details?.available_coins;
        return available !== undefined
          ? `You only have ${available} Coins available to exchange.`
          : "You don't have enough Coins available for that.";
      }

      case "EXCHANGE_VALUE_TOO_SMALL":
        return "That amount is worth less than the smallest payout unit at the current rate — try a larger amount.";

      case "EXCHANGE_UNAVAILABLE":
        return "Exchanging Coins isn't available yet — check back soon.";

      case "ACCOUNT_NOT_ACTIVE":
        return "Your account isn't active, so this action isn't available. Please contact support.";

      case "DUPLICATE_EXCHANGE_REQUEST":
        return "You already have a matching exchange request open — please wait for it to process.";

      case "IDEMPOTENCY_KEY_REUSED":
        return "This request doesn't match a previous attempt — please refresh and try again.";

      case "RESOURCE_NOT_FOUND":
      case "NOT_FOUND":
        return "This resource is no longer available.";

      case "STORAGE_UNAVAILABLE":
        return "We couldn't prepare this file. No access was used. Please try again.";

      case "ACCESS_PACK_UNAVAILABLE":
        return "Buying more accesses isn't available right now.";

      case "PURCHASE_IN_PROGRESS":
        return "Your purchase is already being prepared — please wait a moment.";

      case "GIG_OWN_GIG":
        return "You can't express interest in your own gig.";

      case "GIG_NOT_ACCEPTING_INTEREST": {
        const reason = this.details?.reason;
        if (reason === "capacity_reached") return "This gig has reached its interest limit.";
        if (reason === "deadline_passed") return "This gig's application deadline has passed.";
        if (reason === "manually_closed") return "This gig is no longer accepting interest.";
        return "This gig is no longer accepting interest.";
      }

      case "GIG_CREATOR_NOT_RATEABLE":
        return "Only gigs posted by a student can have their creator rated.";

      case "GIG_NOT_WORKED_WITH":
        return "Only a student who was marked as worked with on this gig can be rated.";

      case "GIG_NOT_APPLICANT":
        return "That student hasn't shown interest in this gig.";

      case "GIG_HAS_RATINGS":
        return "This can't be changed because a rating already exists for it.";

      case "GIG_CLOSED_BY_ADMIN":
        return "An admin closed this gig — only an admin can reopen it.";

      case "GIG_INVALID_STATE":
        return "This action isn't available for the gig's current status.";

      case "GIG_DEADLINE_PASSED":
        return "Set a new, future deadline before continuing.";

      case "GIG_CAPACITY_REACHED":
        return "Raise the applicant limit, or switch to open interest, before reopening.";

      case "GUIDANCE_RATE_LIMITED": {
        const limit = this.details?.limit;
        return typeof limit === "number"
          ? `You've asked for guidance ${limit} times in the last 24 hours, which is today's limit. Please try again tomorrow.`
          : "You've reached today's guidance request limit. Please try again tomorrow.";
      }

      case "GUIDANCE_CONTACT_UNAVAILABLE":
        return "No guidance contact is available right now. Please try again later.";

      default:
        return this.message || "An error occurred. Please try again.";
    }
  }
}
