import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UploadDropzone } from "@/components/dashboard/UploadDropzone";

describe("UploadDropzone", () => {
  it("accepts a supported video file from the picker", async () => {
    const user = userEvent.setup();
    const onSelectFile = vi.fn();
    render(<UploadDropzone onSelectFile={onSelectFile} progress={null} />);

    const file = new File(["video"], "clip.mp4", { type: "video/mp4" });
    await user.upload(screen.getByTestId("dashboard.file_input"), file);

    expect(onSelectFile).toHaveBeenCalledTimes(1);
    expect(onSelectFile.mock.calls[0][0]).toBe(file);
  });

  it("rejects an unsupported file type with a visible error", async () => {
    // The input carries an `accept` filter; disable it so the component's own
    // extension validation is what rejects the file.
    const user = userEvent.setup({ applyAccept: false });
    const onSelectFile = vi.fn();
    render(<UploadDropzone onSelectFile={onSelectFile} progress={null} />);

    const file = new File(["text"], "notes.txt", { type: "text/plain" });
    await user.upload(screen.getByTestId("dashboard.file_input"), file);

    expect(onSelectFile).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That file type is not supported",
    );
  });

  it("shows a progress indicator while an upload is in flight", () => {
    render(
      <UploadDropzone
        onSelectFile={vi.fn()}
        progress={42}
        uploadingName="clip.mp4"
      />,
    );

    const bar = screen.getByRole("progressbar", { name: "Upload progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("clip.mp4")).toBeInTheDocument();
  });

  it("surfaces a parent-supplied upload error", () => {
    render(
      <UploadDropzone
        onSelectFile={vi.fn()}
        progress={null}
        error="The upload did not finish."
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The upload did not finish.",
    );
  });
});
