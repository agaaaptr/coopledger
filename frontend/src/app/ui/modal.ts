import { Component, HostListener, Injectable, inject, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

interface ModalState extends ConfirmOptions {
  confirmLabel: string;
  danger: boolean;
}

@Injectable({ providedIn: 'root' })
export class ModalService {
  private readonly state = signal<ModalState | null>(null);
  private resolver: ((ok: boolean) => void) | null = null;

  readonly current = this.state.asReadonly();

  confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
      this.state.set({ confirmLabel: 'Ya', danger: false, ...options });
    });
  }

  respond(ok: boolean): void {
    this.state.set(null);
    this.resolver?.(ok);
    this.resolver = null;
  }
}

/** Confirmation dialog rendered once at the app root; drive it via ModalService.confirm(). */
@Component({
  selector: 'app-modal',
  imports: [],
  template: `
    @if (modal.current(); as m) {
      <div class="modal-backdrop" (click)="backdrop($event)">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <h2 class="modal-title" id="modal-title">{{ m.title }}</h2>
          <p class="modal-message">{{ m.message }}</p>
          <div class="modal-actions">
            <button class="btn btn-ghost" type="button" (click)="modal.respond(false)">Batal</button>
            <button
              class="btn"
              [class.btn-danger]="m.danger"
              [class.btn-primary]="!m.danger"
              type="button"
              autofocus
              (click)="modal.respond(true)"
            >
              {{ m.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  protected readonly modal = inject(ModalService);

  protected backdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.modal.respond(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.modal.current()) {
      this.modal.respond(false);
    }
  }
}
