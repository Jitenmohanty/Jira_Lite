import { expect, type Page } from '@playwright/test';

/**
 * Submit an auth form robustly against a cold Next.js dev route. Before React
 * hydrates, clicking the submit button falls back to a NATIVE form submit — a
 * GET that reloads the page with the field values as query params (e.g.
 * `/login?email=…&password=…`) and never calls the API. We detect that fallback
 * and retry with a fresh navigation (the route is warm/hydrated by then).
 *
 * `onSubmitted` resolves true once the desired post-submit state is reached.
 */
async function submitAuthForm(
  page: Page,
  path: string,
  fill: () => Promise<void>,
  buttonName: RegExp | string,
  onSubmitted: () => Promise<boolean>,
  attempts = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await page.goto(path);
    await fill();
    await page.getByRole('button', { name: buttonName }).click();
    if (await onSubmitted()) return;
    // Native (pre-hydration) submit — the URL now carries the field values.
    // Fall through and retry with a fresh, hydrated page.
  }
  throw new Error(`submitAuthForm: form at ${path} never reached the expected state`);
}

/** Log in through the UI and wait until the app shell loads. Retries the cold-route race. */
export async function uiLogin(page: Page, email: string, password: string): Promise<void> {
  await submitAuthForm(
    page,
    '/login',
    async () => {
      await page.fill('#email', email);
      await page.fill('#password', password);
    },
    'Sign in',
    async () => {
      await page
        .waitForURL((u) => u.pathname.startsWith('/app') || u.search.includes('email='), {
          timeout: 12_000,
        })
        .catch(() => undefined);
      return page.url().includes('/app');
    },
  );
}

/** Sign up through the UI and wait until the app shell loads. Retries the cold-route race. */
export async function uiSignup(
  page: Page,
  user: { name: string; email: string; password: string },
): Promise<void> {
  await submitAuthForm(
    page,
    '/signup',
    async () => {
      await page.fill('#name', user.name);
      await page.fill('#email', user.email);
      await page.fill('#password', user.password);
    },
    /create account/i,
    async () => {
      await page
        .waitForURL((u) => u.pathname.startsWith('/app') || u.search.includes('email='), {
          timeout: 12_000,
        })
        .catch(() => undefined);
      return page.url().includes('/app');
    },
  );
}

/**
 * Fill the signup form with the given values and submit, expecting the client
 * to REJECT it (stay on /signup and surface `errorRe`). Retries the cold-route
 * race where a pre-hydration native submit turns the click into a GET.
 */
export async function uiSignupExpectError(
  page: Page,
  user: { name: string; email: string; password: string },
  errorRe: RegExp,
): Promise<void> {
  await submitAuthForm(
    page,
    '/signup',
    async () => {
      await page.fill('#name', user.name);
      await page.fill('#email', user.email);
      await page.fill('#password', user.password);
    },
    /create account/i,
    async () => {
      // Hydrated path → validation error shown. Native submit → no error → retry.
      return page
        .getByText(errorRe)
        .first()
        .waitFor({ state: 'visible', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
    },
  );
}

/** Attempt a UI login expected to FAIL, and wait for the error message. Retries the cold-route race. */
export async function uiLoginExpectError(
  page: Page,
  email: string,
  password: string,
  errorRe: RegExp,
): Promise<void> {
  await submitAuthForm(
    page,
    '/login',
    async () => {
      await page.fill('#email', email);
      await page.fill('#password', password);
    },
    'Sign in',
    async () => {
      // JS path → 401 → error shown. Native submit → no error → retry.
      return page
        .getByText(errorRe)
        .waitFor({ state: 'visible', timeout: 8_000 })
        .then(() => true)
        .catch(() => false);
    },
  );
}

/**
 * Land on the app shell and wait until the active org has resolved. The org is
 * selected client-side after `GET /orgs` returns; until then the org switcher
 * reads "No organization" and org-scoped pages render empty. Navigating here
 * first (and then moving between pages via the in-app sidebar links) keeps the
 * selected-org state alive — a hard `goto` to a sub-page resets it.
 */
export async function openApp(page: Page): Promise<void> {
  await page.goto('/app');
  await expect(page.getByRole('button', { name: /no organization/i })).toHaveCount(0, {
    timeout: 15_000,
  });
}

/** Open the app shell, then follow a sidebar nav link (SPA navigation). */
export async function openSection(page: Page, name: RegExp | string): Promise<void> {
  await openApp(page);
  await page.getByRole('link', { name }).click();
}
