"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  formatZodError,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/validation";
import {
  createSession,
  createUserAccount,
  deleteSession,
  findUserByEmail,
  getUserBySession,
} from "@/lib/store";

const SESSION_COOKIE = "tp_session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  return getUserBySession(sessionId);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function signUpWithEmail(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    username: String(formData.get("username") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    redirect(
      `/sign-in?tab=signup&error=${encodeURIComponent(formatZodError(parsed.error))}`,
    );
  }

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    redirect(
      `/sign-in?tab=signup&error=${encodeURIComponent("An account with this email already exists.")}`,
    );
  }

  try {
    const user = await createUserAccount({
      name: parsed.data.name,
      username: parsed.data.username,
      email: parsed.data.email,
      passwordHash: hashPassword(parsed.data.password),
    });

    const session = await createSession(user.id);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, session.id, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create account.";
    redirect(`/sign-in?tab=signup&error=${encodeURIComponent(message)}`);
  }

  redirect("/dashboard");
}

export async function signInWithEmail(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    redirect(
      `/sign-in?tab=signin&error=${encodeURIComponent(formatZodError(parsed.error))}`,
    );
  }

  const user = await findUserByEmail(parsed.data.email);
  if (!user) {
    redirect(
      `/sign-in?tab=signin&error=${encodeURIComponent("No account found for this email. Please sign up first.")}`,
    );
  }

  if (!user.passwordHash) {
    redirect(
      `/sign-in?tab=signup&error=${encodeURIComponent("This account needs a password. Create a new account with the same email.")}`,
    );
  }

  if (!verifyPassword(parsed.data.password, user.passwordHash)) {
    redirect(
      `/sign-in?tab=signin&error=${encodeURIComponent("Incorrect password. Please try again.")}`,
    );
  }

  const session = await createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/dashboard");
}

export async function signOut() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await deleteSession(sessionId);
  }

  cookieStore.delete(SESSION_COOKIE);
  redirect("/sign-in");
}
