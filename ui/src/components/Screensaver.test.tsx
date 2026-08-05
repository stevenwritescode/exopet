import { render, act, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Screensaver, { VIDEO_SCENE_MS, CARD_MS } from "./Screensaver";
import { getAnimals } from "../dal/Animal.dal";
import { System } from "aquario-models";

jest.mock("../dal/Tank.dal", () => ({
  getTemperatureStatuses: jest.fn().mockResolvedValue([]),
}));

jest.mock("../dal/Animal.dal", () => ({
  getAnimals: jest.fn().mockResolvedValue([]),
}));

let wsHandler: ((evt: any) => void) | null = null;
jest.mock("../dal/Maintenance.dal", () => ({
  initWebSocket: jest.fn(),
  onMessage: jest.fn((cb: any) => {
    wsHandler = cb;
  }),
  checkSumpLevel: jest.fn(),
}));

jest.mock("../dal/Species.dal", () => ({
  getSpeciesInfo: jest.fn().mockResolvedValue(null),
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
    // resetMocks (set by CRA's jest config) wipes mock implementations between
    // tests, so re-apply the defaults here so every test starts with working mocks.
    (require("../dal/Tank.dal").getTemperatureStatuses as jest.Mock).mockResolvedValue([]);
    (require("../dal/Animal.dal").getAnimals as jest.Mock).mockResolvedValue([]);
    (require("../dal/Species.dal").getSpeciesInfo as jest.Mock).mockResolvedValue(null);
    (require("../dal/Maintenance.dal").onMessage as jest.Mock).mockImplementation((cb: any) => {
      wsHandler = cb;
    });
    (require("../dal/Maintenance.dal").checkSumpLevel as jest.Mock).mockImplementation(() => {});
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

  const ANIMALS = [
    { id: "a1", name: "Cosmo", species: "Axolotl" },
    { id: "a2", name: "Echo", species: "Axolotl" },
  ];

  it("switches from video to animal cards after the video scene", async () => {
    (getAnimals as jest.Mock).mockResolvedValue(ANIMALS);
    renderSaver(1000);
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    expect(document.querySelector("video")).not.toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(VIDEO_SCENE_MS + 10);
    });
    expect(document.querySelector("video")).toBeNull();
    expect(screen.getByText("Cosmo")).toBeInTheDocument();
  });

  it("returns to the video after all cards have shown", async () => {
    (getAnimals as jest.Mock).mockResolvedValue(ANIMALS);
    renderSaver(1000);
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    await act(async () => {
      jest.advanceTimersByTime(VIDEO_SCENE_MS + 10);
    });
    await act(async () => {
      jest.advanceTimersByTime(ANIMALS.length * CARD_MS + 10);
    });
    expect(document.querySelector("video")).not.toBeNull();
  });

  it("stays on the video when there are no animals", async () => {
    (getAnimals as jest.Mock).mockResolvedValue([]);
    renderSaver(1000);
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    await act(async () => {
      jest.advanceTimersByTime(VIDEO_SCENE_MS * 2);
    });
    expect(document.querySelector("video")).not.toBeNull();
  });

  it("shows the sump lockout banner when a lockout broadcast arrives", async () => {
    renderSaver(1000);
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    act(() => {
      wsHandler?.({
        data: JSON.stringify({
          action: "sump_state",
          data: { state: 4 },
        }),
      });
    });
    expect(screen.getByText(/SUMP LOCKED OUT/i)).toBeInTheDocument();
    act(() => {
      wsHandler?.({
        data: JSON.stringify({
          action: "sump_state",
          data: { state: 0 },
        }),
      });
    });
    expect(screen.queryByText(/SUMP LOCKED OUT/i)).toBeNull();
  });

  it("shows the lockout banner when a sump_water_level reply with state 4 arrives on activation", async () => {
    renderSaver(1000);
    // Activate the screensaver — this also fires checkSumpLevel
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    // Simulate the API reply to checkSumpLevel carrying state = LOCKED_OUT (4)
    act(() => {
      wsHandler?.({
        data: JSON.stringify({
          action: "sump_water_level",
          data: { sumpFull: true, state: 4 },
        }),
      });
    });
    expect(screen.getByText(/SUMP LOCKED OUT/i)).toBeInTheDocument();
    // A float-poll reply without a state field must NOT clear the banner
    act(() => {
      wsHandler?.({
        data: JSON.stringify({
          action: "sump_water_level",
          data: { sumpFull: true },
        }),
      });
    });
    expect(screen.getByText(/SUMP LOCKED OUT/i)).toBeInTheDocument();
  });
});
