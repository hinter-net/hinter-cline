const { rl, isValidSlug, isValidPublicKey, slugify } = require('../src/utils');

describe('utils', () => {
    afterAll(() => {
        rl.close();
    });
    describe('isValidSlug', () => {
        it('should return true for valid slugs', () => {
            expect(isValidSlug('a-valid-slug')).toBe(true);
            expect(isValidSlug('another-one')).toBe(true);
            expect(isValidSlug('slug1')).toBe(true);
        });

        it('should return false for invalid slugs', () => {
            expect(isValidSlug('Invalid Slug')).toBe(false);
            expect(isValidSlug('invalid_slug')).toBe(false);
            expect(isValidSlug('-invalid-slug')).toBe(false);
            expect(isValidSlug('invalid-slug-')).toBe(false);
            expect(isValidSlug('invalid--slug')).toBe(false);
        });
    });

    describe('isValidPublicKey', () => {
        it('should return true for valid public keys', () => {
            expect(isValidPublicKey('a'.repeat(64))).toBe(true);
            expect(isValidPublicKey('f'.repeat(64))).toBe(true);
            expect(isValidPublicKey('0'.repeat(64))).toBe(true);
            expect(isValidPublicKey('9'.repeat(64))).toBe(true);
        });

        it('should return false for invalid public keys', () => {
            expect(isValidPublicKey('g'.repeat(64))).toBe(false);
            expect(isValidPublicKey('a'.repeat(63))).toBe(false);
            expect(isValidPublicKey('a'.repeat(65))).toBe(false);
            expect(isValidPublicKey('A'.repeat(64))).toBe(false);
        });
    });

    describe('slugify', () => {
        it('should correctly slugify a string', () => {
            expect(slugify('A Test String')).toBe('a-test-string');
            expect(slugify('  Another--Test  ')).toBe('another-test');
            expect(slugify('A_Third_Test')).toBe('a-third-test');
            expect(slugify('A fourth test!')).toBe('a-fourth-test');
        });
    });
});
