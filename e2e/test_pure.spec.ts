import { test, expect } from '@playwright/test';
test.describe('Pure test', () => {
    test('works', () => {
        expect(1).toBe(1);
    });
});
