import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Chip from "../Chip";

describe("Chip", () => {
  it("renders its label and calls onPress when tapped", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Chip label="Braids" selected={false} onPress={onPress} />);

    expect(getByText("Braids")).toBeTruthy();
    fireEvent.press(getByText("Braids"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("still calls onPress when already selected, letting the parent decide how to toggle it", async () => {
    const onPress = jest.fn();
    const { getByText } = await render(<Chip label="4C" selected onPress={onPress} />);

    fireEvent.press(getByText("4C"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
