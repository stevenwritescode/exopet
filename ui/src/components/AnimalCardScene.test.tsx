jest.mock("../dal/Species.dal", () => ({
  getSpeciesInfo: jest.fn().mockResolvedValue({
    title: "Axolotl",
    extract: "A paedomorphic salamander.",
    image: "https://upload.wikimedia.org/axolotl.jpg",
  }),
}));

import { render, screen, act } from "@testing-library/react";
import AnimalCardScene from "./AnimalCardScene";

const ANIMALS = [
  {
    id: "a1",
    name: "Cosmo",
    species: "Axolotl",
    species_latin: "Ambystoma mexicanum",
    notes: "Likes worms",
  },
  { id: "a2", name: "Echo", species: "Axolotl" },
] as any[];

describe("AnimalCardScene", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows the first animal's name, species, and notes", async () => {
    render(<AnimalCardScene animals={ANIMALS} cardMs={1000} />);
    expect(screen.getByText("Cosmo")).toBeInTheDocument();
    expect(screen.getByText(/Ambystoma mexicanum/)).toBeInTheDocument();
    expect(screen.getByText(/Likes worms/)).toBeInTheDocument();
  });

  it("shows the Wikipedia extract once loaded", async () => {
    // Switch to real timers so that Promise microtasks and React's scheduler
    // (which uses setImmediate/MessageChannel) can flush state updates.
    // Provide a fresh mockResolvedValue so the mock returns a properly-resolved
    // promise in the real-timer context.
    jest.useRealTimers();
    const { getSpeciesInfo: mockFn } = jest.requireMock("../dal/Species.dal");
    mockFn.mockResolvedValue({
      title: "Axolotl",
      extract: "A paedomorphic salamander.",
      image: "https://upload.wikimedia.org/axolotl.jpg",
    });
    render(<AnimalCardScene animals={ANIMALS} cardMs={60_000} />);
    // Wrap the wait in async act() so React 18 commits the state update
    // triggered by the mocked getSpeciesInfo promise resolving.
    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });
    expect(screen.getByText(/A paedomorphic salamander/)).toBeInTheDocument();
  });

  it("advances to the next animal after cardMs", async () => {
    render(<AnimalCardScene animals={ANIMALS} cardMs={1000} />);
    await act(async () => {
      jest.advanceTimersByTime(1001);
    });
    expect(screen.getByText("Echo")).toBeInTheDocument();
    expect(screen.queryByText("Cosmo")).toBeNull();
  });

  it("renders nothing when there are no animals", () => {
    const { container } = render(<AnimalCardScene animals={[]} cardMs={1000} />);
    expect(container.firstChild).toBeNull();
  });
});
