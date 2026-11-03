import { Component, ElementRef, HostListener, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: unknown;
  label: string;
}

/** Accessible, styled replacement for the native <select>. Integrates with Reactive Forms. */
@Component({
  selector: 'app-select',
  imports: [],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true },
  ],
  template: `
    <div class="select" [class.open]="open()" [class.invalid]="invalid()" [class.disabled]="disabled()">
      <button
        type="button"
        class="select-trigger"
        [disabled]="disabled()"
        [attr.id]="id() || null"
        [attr.aria-label]="ariaLabel() || null"
        [attr.aria-expanded]="open()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        (click)="toggle()"
      >
        <span class="select-value" [class.placeholder]="!hasValue()">{{ label() }}</span>
        <svg class="icon chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      @if (open()) {
        <ul class="select-menu" role="listbox">
          @for (option of options(); track option.value) {
            <li role="presentation">
              <button
                type="button"
                class="select-option"
                role="option"
                [class.selected]="option.value === value"
                [attr.aria-selected]="option.value === value"
                (click)="choose(option)"
              >
                {{ option.label }}
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class SelectComponent implements ControlValueAccessor {
  readonly options = input.required<SelectOption[]>();
  readonly placeholder = input('');
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);
  readonly id = input<string>('');
  readonly ariaLabel = input<string>('');

  protected readonly open = signal(false);
  protected readonly disabled = signal(false);
  protected value: unknown = null;

  private onChange: (value: unknown) => void = () => {};
  private onTouched: () => void = () => {};
  private readonly el = inject(ElementRef);

  writeValue(value: unknown): void {
    this.value = value;
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected label(): string {
    const found = this.options().find((option) => option.value === this.value);
    return found ? found.label : this.placeholder() || 'Pilih…';
  }

  protected hasValue(): boolean {
    return this.value !== null && this.value !== undefined && this.value !== '';
  }

  protected toggle(): void {
    if (!this.disabled()) {
      this.open.update((isOpen) => !isOpen);
    }
  }

  protected choose(option: SelectOption): void {
    this.value = option.value;
    this.onChange(option.value);
    this.onTouched();
    this.open.set(false);
  }

  protected close(): void {
    this.open.set(false);
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }
}
