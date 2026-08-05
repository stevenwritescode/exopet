import axios from "axios";
import { getSpeciesInfo } from "./Species.dal";

jest.mock("axios");
const mockedGet = axios.get as jest.Mock;

const WIKI_RESPONSE = {
  data: {
    title: "Axolotl",
    extract: "The axolotl is a paedomorphic salamander.",
    thumbnail: { source: "https://upload.wikimedia.org/axolotl.jpg" },
  },
};

describe("getSpeciesInfo", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedGet.mockReset();
  });

  it("returns null for an empty query without calling the network", async () => {
    expect(await getSpeciesInfo(undefined)).toBeNull();
    expect(await getSpeciesInfo("")).toBeNull();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("fetches the Wikipedia summary and maps title/extract/image", async () => {
    mockedGet.mockResolvedValueOnce(WIKI_RESPONSE);
    const info = await getSpeciesInfo("Ambystoma mexicanum");
    expect(mockedGet).toHaveBeenCalledWith(
      "https://en.wikipedia.org/api/rest_v1/page/summary/Ambystoma%20mexicanum"
    );
    expect(info).toMatchObject({
      title: "Axolotl",
      extract: "The axolotl is a paedomorphic salamander.",
      image: "https://upload.wikimedia.org/axolotl.jpg",
    });
  });

  it("serves the second lookup from cache (case-insensitive key)", async () => {
    mockedGet.mockResolvedValueOnce(WIKI_RESPONSE);
    await getSpeciesInfo("Ambystoma mexicanum");
    const info = await getSpeciesInfo("ambystoma MEXICANUM");
    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(info?.title).toBe("Axolotl");
  });

  it("refetches after the 30-day TTL expires", async () => {
    mockedGet.mockResolvedValue(WIKI_RESPONSE);
    const realNow = Date.now;
    Date.now = jest.fn(() => 1_000_000);
    await getSpeciesInfo("Axolotl");
    Date.now = jest.fn(() => 1_000_000 + 31 * 24 * 60 * 60 * 1000);
    await getSpeciesInfo("Axolotl");
    Date.now = realNow;
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("returns null on network failure with an empty cache", async () => {
    mockedGet.mockRejectedValueOnce(new Error("offline"));
    expect(await getSpeciesInfo("Axolotl")).toBeNull();
  });

  it("falls back to a stale cache entry when the refetch fails", async () => {
    mockedGet.mockResolvedValueOnce(WIKI_RESPONSE);
    const realNow = Date.now;
    Date.now = jest.fn(() => 1_000_000);
    await getSpeciesInfo("Axolotl");
    Date.now = jest.fn(() => 1_000_000 + 31 * 24 * 60 * 60 * 1000);
    mockedGet.mockRejectedValueOnce(new Error("offline"));
    const info = await getSpeciesInfo("Axolotl");
    Date.now = realNow;
    expect(info?.title).toBe("Axolotl");
  });
});
