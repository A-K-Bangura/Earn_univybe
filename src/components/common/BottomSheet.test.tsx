import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { BottomSheet } from "./BottomSheet";

const Harness = ({ onClose = () => {} }: { onClose?: () => void }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open filters</button>
      <BottomSheet
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="Filter courses"
        footer={<button>Apply</button>}
      >
        <input aria-label="Search inside" />
      </BottomSheet>
    </>
  );
};

describe("BottomSheet", () => {
  it("renders nothing while closed", () => {
    render(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens as a labelled modal dialog and locks page scroll", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Open filters" }));

    const dialog = screen.getByRole("dialog", { name: "Filter courses" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes on Escape, restores scroll and returns focus to the opener", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole("button", { name: "Open filters" });

    await user.click(opener);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).not.toBe("hidden");
    expect(opener).toHaveFocus();
  });

  it("closes from the close button", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open filters" }));

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps Tab focus inside the sheet", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open filters" }));

    // close button -> input -> Apply -> wraps back to the close button
    await user.tab();
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });
});
