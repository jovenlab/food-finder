// Tests for the four screens that are not a list of products.
//
// Every asynchronous request has more than two outcomes, and each needs its own
// answer to "what should the user see, and what should they do next?".

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  ErrorPanel,
  InitialPrompt,
  LoadingSkeleton,
  NoResults,
} from "@/components/SearchStates";
import { renderWithLanguage } from "./helpers";

describe("InitialPrompt - nothing searched yet", () => {
  it("explains what to do instead of showing a blank page", () => {
    renderWithLanguage(<InitialPrompt onExample={() => {}} />);

    expect(
      screen.getByText("Search for a packaged food product to see its name, brand and photo.")
    ).toBeInTheDocument();
  });

  it("offers example searches that actually run a search", async () => {
    const onExample = vi.fn();
    renderWithLanguage(<InitialPrompt onExample={onExample} />);

    await userEvent.click(screen.getByRole("button", { name: "nutella" }));

    expect(onExample).toHaveBeenCalledWith("nutella");
  });
});

describe("LoadingSkeleton", () => {
  it("says what it is searching for", () => {
    renderWithLanguage(<LoadingSkeleton term="nutella" />);

    expect(screen.getByText("Searching for “nutella”…")).toBeInTheDocument();
  });

  it("announces itself to screen readers", () => {
    // Sighted users see skeleton cards; this is the equivalent for everyone else.
    renderWithLanguage(<LoadingSkeleton term="nutella" />);

    const status = screen.getByText("Searching for “nutella”…");

    expect(status).toHaveAttribute("aria-live", "polite");
  });
});

describe("NoResults - the search worked, there was nothing to find", () => {
  it("names the term that found nothing and suggests what to try", () => {
    renderWithLanguage(<NoResults term="zzzznotafood" />);

    expect(screen.getByText("No products found for “zzzznotafood”.")).toBeInTheDocument();
    expect(
      screen.getByText("Try a different spelling, a brand name, or a more general word.")
    ).toBeInTheDocument();
  });

  it("is NOT presented as an error", () => {
    // Nothing is broken, so this must not be announced as an alert or styled as
    // a failure. Finding nothing is a normal outcome.
    const { container } = renderWithLanguage(<NoResults term="zzzz" />);

    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});

describe("ErrorPanel", () => {
  it("shows the message and announces it immediately", () => {
    renderWithLanguage(
      <ErrorPanel messageKey="errorNetwork" canRetry={true} onRetry={() => {}} />
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Could not reach the server. Check that the backend is running, then try again."
      )
    ).toBeInTheDocument();
  });

  it("offers Try again for failures that retrying could fix", async () => {
    const onRetry = vi.fn();
    renderWithLanguage(
      <ErrorPanel messageKey="errorExternalApi" canRetry={true} onRetry={onRetry} />
    );

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(onRetry).toHaveBeenCalled();
  });

  it("hides Try again when retrying cannot possibly help", () => {
    // A term that is too long will be too long again. A button that always fails
    // is worse than no button.
    renderWithLanguage(
      <ErrorPanel messageKey="errorTooLong" canRetry={false} onRetry={() => {}} />
    );

    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });

  it("shows error messages in the selected language", () => {
    renderWithLanguage(
      <ErrorPanel messageKey="errorNetwork" canRetry={true} onRetry={() => {}} />,
      "de"
    );

    expect(
      screen.getByText(
        "Der Server ist nicht erreichbar. Prüfen Sie, ob das Backend läuft, und versuchen Sie es erneut."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Erneut versuchen" })).toBeInTheDocument();
  });
});
