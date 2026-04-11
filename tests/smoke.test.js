const isRepoSetup = require("./smoke");

test("testing setup works", () => {
  expect(isRepoSetup()).toBe(true);
});