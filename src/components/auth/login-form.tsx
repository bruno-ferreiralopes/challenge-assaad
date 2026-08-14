"use client";

import { useState } from "react";

import { getApiErrorMessage } from "@/lib/auth/errors";
import { FormTooltip } from "@/components/ui/form-tooltip";
import { Spinner } from "../ui/spinner";

type FieldErrors = {
  email?: string;
  password?: string;
};

function validateForm(form: HTMLFormElement): FieldErrors {
  const errors: FieldErrors = {};
  const email = form.email.value.trim();
  const password = form.password.value;

  if (!email) {
    errors.email = "Informe um email valido.";
  } else if (!form.email.validity.valid) {
    errors.email = "Digite um email valido.";
  }

  if (!password) {
    errors.password = "Informe sua senha.";
  }

  return errors;
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [tooltipResetKey, setTooltipResetKey] = useState(0);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateForm(event.currentTarget);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setTooltipResetKey((current) => current + 1);
      return;
    }

    setIsPending(true);
    setFormError(undefined);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      let body: { success?: boolean; error?: string } = {};

      try {
        body = (await response.json()) as { success?: boolean; error?: string };
      } catch {
        body = {};
      }

      if (response.ok && body.success) {
        window.location.href = "/dashboard";
        return;
      }

      setFormError(
        body.error ?? getApiErrorMessage(response.status, body),
      );
      setTooltipResetKey((current) => current + 1);
    } catch {
      setFormError(
        "Nao foi possivel conectar ao servidor. Verifique sua conexao e tente novamente.",
      );
      setTooltipResetKey((current) => current + 1);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <div className="relative">
          <FormTooltip
            message={fieldErrors.email}
            id="email-error"
            resetKey={tooltipResetKey}
            onDismiss={() =>
              setFieldErrors((current) => ({ ...current, email: undefined }))
            }
          />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-60 aria-invalid:border-red-500 aria-invalid:focus:border-red-500 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="seu@email.com"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <div className="relative">
          <FormTooltip
            message={fieldErrors.password}
            id="password-error"
            resetKey={tooltipResetKey}
            onDismiss={() =>
              setFieldErrors((current) => ({ ...current, password: undefined }))
            }
          />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? "password-error" : undefined
            }
            onChange={(event) => {
              setPassword(event.target.value);
              setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 disabled:opacity-60 aria-invalid:border-red-500 aria-invalid:focus:border-red-500 dark:border-zinc-700 dark:bg-zinc-900"
            placeholder="********"
          />
        </div>
      </div>

      <div className="relative">
        <FormTooltip
          message={formError}
          id="form-error"
          className="form-tooltip--above-button"
          resetKey={tooltipResetKey}
          onDismiss={() => setFormError(undefined)}
        />
        <button
          type="submit"
          disabled={isPending}
          aria-describedby={formError ? "form-error" : undefined}
          className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isPending ? <Spinner color="black" width="16px" height="16px" /> : <>Entrar</>}
        </button>
      </div>
    </form>
  );
}
