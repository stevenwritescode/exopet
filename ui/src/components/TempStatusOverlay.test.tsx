import { render, screen, waitFor } from "@testing-library/react";
import TempStatusOverlay from "./TempStatusOverlay";
import * as TankDal from "../dal/Tank.dal";

jest.mock("../dal/Tank.dal");

const mocked = TankDal as jest.Mocked<typeof TankDal>;

describe("TempStatusOverlay", () => {
  it("renders a temperature chip per tank and a dash for inactive sensors", async () => {
    mocked.getTemperatureStatuses.mockResolvedValue([
      {
        tank_id: "t1",
        name: "Cosmo",
        average: 26,
        lower_temp_limit: 24,
        upper_temp_limit: 28,
      },
      { tank_id: "t2", name: "Echo", average: null },
    ]);
    render(<TempStatusOverlay />);
    await waitFor(() =>
      expect(screen.getByText("26°C / 79°F")).toBeInTheDocument()
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders nothing when no tanks have thermometers", async () => {
    mocked.getTemperatureStatuses.mockResolvedValue([]);
    const { container } = render(<TempStatusOverlay />);
    await waitFor(() =>
      expect(mocked.getTemperatureStatuses).toHaveBeenCalled()
    );
    expect(container.firstChild).toBeNull();
  });
});
