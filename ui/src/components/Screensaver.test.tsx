import { render, screen, act, fireEvent } from "@testing-library/react";
import Screensaver from "./Screensaver";

describe("Screensaver", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("stays hidden before the idle timeout", () => {
    render(<Screensaver timeoutMs={1000} />);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(document.querySelector("video")).toBeNull();
  });

  it("shows the video after the idle timeout", () => {
    render(<Screensaver timeoutMs={1000} />);
    act(() => {
      jest.advanceTimersByTime(1001);
    });
    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("/media/cosmo-echo-vid.mp4");
  });

  it("activity resets the idle timer", () => {
    render(<Screensaver timeoutMs={1000} />);
    act(() => {
      jest.advanceTimersByTime(800);
    });
    fireEvent.pointerDown(window);
    act(() => {
      jest.advanceTimersByTime(800);
    });
    expect(document.querySelector("video")).toBeNull();
  });

  it("dismisses on tap and re-arms", () => {
    render(<Screensaver timeoutMs={1000} />);
    act(() => {
      jest.advanceTimersByTime(1001);
    });
    const overlay = document.querySelector("video")?.parentElement;
    expect(overlay).not.toBeNull();
    fireEvent.pointerDown(overlay!);
    expect(document.querySelector("video")).toBeNull();
    act(() => {
      jest.advanceTimersByTime(1001);
    });
    expect(document.querySelector("video")).not.toBeNull();
  });
});
