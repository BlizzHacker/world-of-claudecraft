import { describe, expect, it, vi } from 'vitest';
import { togglePasswordVisibility, syncInputAriaState, validateForm, handleKeyboardActivation, validateCharacterName } from '../src/ui/auth_utils';

describe('Auth Utilities', () => {
  it('toggles password visibility and updates button ARIA labels', () => {
    const input = { type: 'password' } as unknown as HTMLInputElement;
    const buttonAttrs = new Map<string, string>();
    const button = {
      setAttribute: (name: string, value: string) => {
        buttonAttrs.set(name, value);
      }
    } as unknown as HTMLButtonElement;
    
    // Toggle password -> text
    togglePasswordVisibility(input, button);
    expect(input.type).toBe('text');
    expect(buttonAttrs.get('aria-pressed')).toBe('true');
    expect(buttonAttrs.get('aria-label')).toBe('Hide password');
    
    // Toggle text -> password
    togglePasswordVisibility(input, button);
    expect(input.type).toBe('password');
    expect(buttonAttrs.get('aria-pressed')).toBe('false');
    expect(buttonAttrs.get('aria-label')).toBe('Show password');
  });

  it('synchronizes input ARIA state based on validity check', () => {
    const inputAttrs = new Map<string, string>();
    let checkValidityValue = true;
    
    const input = {
      checkValidity: () => checkValidityValue,
      setAttribute: (name: string, value: string) => {
        inputAttrs.set(name, value);
      },
      removeAttribute: (name: string) => {
        inputAttrs.delete(name);
      }
    } as unknown as HTMLInputElement;
    
    // Test valid state
    checkValidityValue = true;
    const res1 = syncInputAriaState(input);
    expect(res1).toBe(true);
    expect(inputAttrs.has('aria-invalid')).toBe(false);
    
    // Test invalid state
    checkValidityValue = false;
    const res2 = syncInputAriaState(input);
    expect(res2).toBe(false);
    expect(inputAttrs.get('aria-invalid')).toBe('true');
  });

  it('validates a whole form, highlighting errors and focusing on the first invalid field', () => {
    const userInputAttrs = new Map<string, string>();
    const passInputAttrs = new Map<string, string>();
    let userValid = true;
    let passValid = true;
    const classListToggle = vi.fn();
    const classList = {
      toggle: classListToggle
    } as unknown as DOMTokenList;
    const focusedElements: string[] = [];
    
    const userInput = {
      id: 'login-user',
      checkValidity: () => userValid,
      setAttribute: (name: string, value: string) => {
        userInputAttrs.set(name, value);
      },
      removeAttribute: (name: string) => {
        userInputAttrs.delete(name);
      },
      classList,
      focus: () => {
        focusedElements.push('userInput');
      }
    } as unknown as HTMLInputElement;
    
    const passInput = {
      id: 'login-pass',
      checkValidity: () => passValid,
      setAttribute: (name: string, value: string) => {
        passInputAttrs.set(name, value);
      },
      removeAttribute: (name: string) => {
        passInputAttrs.delete(name);
      },
      classList,
      focus: () => {
        focusedElements.push('passInput');
      }
    } as unknown as HTMLInputElement;
    
    const userErrorEl = { style: { display: 'none' } } as unknown as HTMLElement;
    const passErrorEl = { style: { display: 'none' } } as unknown as HTMLElement;
    
    const form = {
      querySelectorAll: () => [userInput, passInput],
      querySelector: (selector: string) => {
        if (selector === '#login-user-error') return userErrorEl;
        if (selector === '#login-pass-error') return passErrorEl;
        return null;
      }
    } as unknown as HTMLFormElement;
    
    // 1. Both fields valid
    userValid = true;
    passValid = true;
    const validRes = validateForm(form);
    expect(validRes).toBe(true);
    expect(userInputAttrs.has('aria-invalid')).toBe(false);
    expect(passInputAttrs.has('aria-invalid')).toBe(false);
    expect(focusedElements.length).toBe(0);
    expect(userErrorEl.style.display).toBe('none');
    expect(passErrorEl.style.display).toBe('none');
    expect(classListToggle).toHaveBeenCalledWith('user-invalid-fallback', false);
    
    // 2. User field invalid
    userValid = false;
    passValid = true;
    classListToggle.mockClear();
    const userInvalidRes = validateForm(form);
    expect(userInvalidRes).toBe(false);
    expect(userInputAttrs.get('aria-invalid')).toBe('true');
    expect(passInputAttrs.has('aria-invalid')).toBe(false);
    expect(focusedElements[0]).toBe('userInput');
    expect(userErrorEl.style.display).toBe('block');
    expect(passErrorEl.style.display).toBe('none');
    expect(classListToggle).toHaveBeenCalledWith('user-invalid-fallback', true);
    
    // Reset focus tracking
    focusedElements.length = 0;
    
    // 3. Both fields invalid (focuses first invalid: userInput)
    userValid = false;
    passValid = false;
    classListToggle.mockClear();
    const bothInvalidRes = validateForm(form);
    expect(bothInvalidRes).toBe(false);
    expect(userInputAttrs.get('aria-invalid')).toBe('true');
    expect(passInputAttrs.get('aria-invalid')).toBe('true');
    expect(focusedElements[0]).toBe('userInput');
    expect(userErrorEl.style.display).toBe('block');
    expect(passErrorEl.style.display).toBe('block');
    expect(classListToggle).toHaveBeenCalledWith('user-invalid-fallback', true);
  });

  describe('handleKeyboardActivation', () => {
    it('executes callback and returns true when Enter or Space is pressed', () => {
      const cb = vi.fn();
      const preventDefault = vi.fn();
      
      const enterEvent = { key: 'Enter', preventDefault } as unknown as KeyboardEvent;
      const res1 = handleKeyboardActivation(enterEvent, cb);
      expect(res1).toBe(true);
      expect(cb).toHaveBeenCalledTimes(1);
      
      const spaceEvent = { key: ' ', preventDefault } as unknown as KeyboardEvent;
      const res2 = handleKeyboardActivation(spaceEvent, cb);
      expect(res2).toBe(true);
      expect(cb).toHaveBeenCalledTimes(2);
      expect(preventDefault).toHaveBeenCalled();
    });

    it('does not execute callback and returns false for other keys', () => {
      const cb = vi.fn();
      const preventDefault = vi.fn();
      
      const escapeEvent = { key: 'Escape', preventDefault } as unknown as KeyboardEvent;
      const res = handleKeyboardActivation(escapeEvent, cb);
      expect(res).toBe(false);
      expect(cb).not.toHaveBeenCalled();
      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('validateCharacterName', () => {
    it('accepts valid character names', () => {
      expect(validateCharacterName('Thrall')).toBe(true);
      expect(validateCharacterName('Jaina Proudmoore')).toBe(true);
      expect(validateCharacterName("Kael'thas")).toBe(true);
      expect(validateCharacterName('Rexxar-Misha')).toBe(true);
      expect(validateCharacterName('  Uther  ')).toBe(true); // check trimming
      expect(validateCharacterName('Ab')).toBe(true); // minimum length 2
    });

    it('rejects invalid character names', () => {
      expect(validateCharacterName('')).toBe(false); // empty
      expect(validateCharacterName('   ')).toBe(false); // whitespace only
      expect(validateCharacterName('A')).toBe(false); // too short (length 1)
      expect(validateCharacterName('Averylongnameherebuttoolong')).toBe(false); // too long
      expect(validateCharacterName('123Adventurer')).toBe(false); // starts with digit
      expect(validateCharacterName('Adventurer!')).toBe(false); // contains invalid character
      expect(validateCharacterName('-Adventurer')).toBe(false); // starts with hyphen
      expect(validateCharacterName("'Adventurer")).toBe(false); // starts with apostrophe
    });
  });
});
