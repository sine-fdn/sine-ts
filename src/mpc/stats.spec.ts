import { quantile } from "./stats";

test("quantile is 1 for empty datasets", () => {
  expect(quantile(100, 0)).toBe(1);
});

test("quantile is 1 or 10 for invalid ranks", () => {
  expect(quantile(0, 100)).toBe(1);
  expect(quantile(-100, 100)).toBe(1);
  expect(quantile(101, 100)).toBe(10);
});

test("quantile equals rank for datasets < 10", () => {
  for (let size = 1; size < 10; ++size)
    for (let rank = 1; rank <= size; ++rank)
      expect(quantile(rank, size)).toBe(rank);
});

test("quantiles for datasets size 20", () => {
  expect(quantile(1, 20)).toBe(1);
  expect(quantile(2, 20)).toBe(1);
  expect(quantile(3, 20)).toBe(2);
  expect(quantile(4, 20)).toBe(2);
  expect(quantile(5, 20)).toBe(3);
  expect(quantile(6, 20)).toBe(3);

  for (let i = 1; i <= 20; ++i) {
    expect(quantile(i, 20)).toBe(1 + Math.floor((i - 1) / 2));
  }
});
