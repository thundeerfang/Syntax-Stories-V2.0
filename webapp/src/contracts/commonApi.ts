/**
 * Shared JSON envelope patterns used across Syntax Stories REST APIs.
 */

export interface ApiSuccessEnvelope<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ApiListEnvelope<T> {
  success: boolean;
  message?: string;
  items?: T[];
}
