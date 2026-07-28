import { render, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Screensaver from "./Screensaver";

jest.mock("../dal/Tank.dal", () => ({
  getTemperatureStatuses: jest.fn().mockResolvedValue([]),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderSaver(timeoutMs: number, initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Screensaver timeoutMs={timeoutMs} />
      <LocationProbe />
    </MemoryRouter>
  );
}

describe("Screensaver", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("stays hidden before the idle timeout", () => {
    renderSaver(1000);
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(document.querySelector("video")).toBeNull();
  });

  it("shows the video after the idle timeout", () => {
    renderSaver(1000);
    act(() => {
      jest.advanceTimersByTime(1001);
    });
    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe("/media/cosmo-echo-vid-2-loop.mp4");
  });

  it("activity resets the idle timer", () => {
    renderSaver(1000);
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
    renderSaver(1000);
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

  it("returns the app to the home screen when it activates", () => {
    const { getByTestId } = renderSaver(1000, "/tank/some-tank-id");
    expect(getByTestId("location").textContent).toBe("/tank/some-tank-id");
    act(() => {
      jest.advanceTimersByTime(1001);
    });
    expect(document.querySelector("video")).not.toBeNull();
    expect(getByTestId("location").textContent).toBe("/");
  });
});
