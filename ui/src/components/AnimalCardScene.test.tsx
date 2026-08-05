jest.mock("../dal/Species.dal", () => {
  const mockFn = jest.fn();
  mockFn.mockImplementation((_query?: string) => {
    return Promise.resolve({
      title: "Axolotl",
      extract: "A paedomorphic salamander.",
      image: "https://upload.wikimedia.org/axolotl.jpg",
    });
  });
  return {
    __esModule: true,
    getSpeciesInfo: mockFn,
  };
});

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
    // Disable fake timers for this test to allow Promises to resolve
    jest.useRealTimers();
    try {
      render(<AnimalCardScene animals={ANIMALS} cardMs={1000} />);
      expect(
        await screen.findByText(/A paedomorphic salamander/)
      ).toBeInTheDocument();
    } finally {
      jest.useFakeTimers();
    }
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
