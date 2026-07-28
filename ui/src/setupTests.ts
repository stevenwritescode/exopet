// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock("axios");
jest.mock("./dal/Tank.dal");
jest.mock("./dal/Log.dal");
jest.mock("./dal/Animal.dal");
jest.mock("./dal/Maintenance.dal");
