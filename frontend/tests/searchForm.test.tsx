// Tests for the search box.
//
// These render the real component into a fake browser (jsdom) and interact with
// it the way a person would - typing, clicking, pressing Enter - rather than
// calling its internals. That means the test keeps passing when the code is
// refactored, and fails when the user-visible behaviour breaks.

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SearchForm } from "@/components/SearchForm";
import { renderWithLanguage } from "./helpers";

describe("SearchForm", () => {
  it("renders a labelled search box and a button", () => {
    renderWithLanguage(<SearchForm onSearch={() => {}} isSearching={false} />);

    // Found by its accessible label, not by a CSS class - the same way a screen
    // reader finds it. If the label disappears, this test fails, and it should.
    expect(screen.getByLabelText("Search for a food product")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  it("passes the typed term to the parent when the button is clicked", async () => {
    const onSearch = vi.fn();
    renderWithLanguage(<SearchForm onSearch={onSearch} isSearching={false} />);

    await userEvent.type(screen.getByLabelText("Search for a food product"), "nutella");
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(onSearch).toHaveBeenCalledWith("nutella");
  });

  it("also submits when Enter is pressed", async () => {
    // This works only because the component uses a real <form>. Testing it
    // guards against someone replacing the form with a plain <div>.
    const onSearch = vi.fn();
    renderWithLanguage(<SearchForm onSearch={onSearch} isSearching={false} />);

    await userEvent.type(
      screen.getByLabelText("Search for a food product"),
      "chocolate{Enter}"
    );

    expect(onSearch).toHaveBeenCalledWith("chocolate");
  });

  it("disables the button while a search is running", () => {
    // Stops one impatient click becoming five requests.
    renderWithLanguage(<SearchForm onSearch={() => {}} isSearching={true} />);

    const button = screen.getByRole("button", { name: "Searching…" });

    expect(button).toBeDisabled();
  });

  it("shows its text in the selected language", () => {
    renderWithLanguage(<SearchForm onSearch={() => {}} isSearching={false} />, "nl");

    expect(screen.getByRole("button", { name: "Zoeken" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Zoek een product, bijv. nutella")).toBeInTheDocument();
  });
});
