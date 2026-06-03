# Firestore Security Specification

This document outlines the security invariants and rules applied to the Firestore collections for our Minecraft Skin Editor.

## 1. Data Invariants

- **Users Collection (`/users/{userId}`)**:
  - Only authenticated users can create or edit their own profile document.
  - The document ID (`userId`) must exactly match `request.auth.uid`.
  - The `username` must be a non-empty string, up to 30 characters, and match alphanumeric constraints (`^[a-zA-Z0-9_\-]+$`) with no spaces.
  - The `displayName` is restricted to strings under 100 characters.
  - Users are not allowed to update their own statistics fields of followers/following or downloads directly without system verification (or we restrict them to read-only or limit actions if needed).
  - The `createdAt` timestamp is immutable once created.

## 2. Invalidation & Audit (The Dirty Dozen Payloads)

1. **Spoofed Identity write**: User attempts to create a document under `/users/attackerUid` using a different authenticated UID.
2. **Missing Username**: User attempts to write profile with an empty username.
3. **Invalid Character Username**: User attempts to use characters like `<script>` or spaces in their username.
4. **Gigantic Username**: User attempts to write a username carrying more than 100 characters.
5. **Private PII breach**: Unauthenticated user attempts to get another user's private data.
6. **Privilege Escalation**: User attempts to set custom claims or isAdmin values.
7. **Future Timestamping**: User attempts to pass a future client timestamp as `createdAt` instead of `request.time`.
8. **Immutable Field Altering**: User attempts to modify `createdAt` or `id` in their user profile during update.
9. **Junk Fields Injection**: User attempts to inject random payload keys into the user schema.
10. **Malicious ID poisoning**: User attempts to write doc ID with special characters like `/../` or binary.
11. **Negative Counters**: User attempts to set `skinsCreated` to a negative integer.
12. **Blind List query**: User queries all documents globally without constraints.

## 3. Security Rules Plan

We will deploy our rules verifying that every collection (including users, skins, etc.) is perfectly isolated.
