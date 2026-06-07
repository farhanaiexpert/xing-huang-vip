/**
 * DEPOSIT GATE
 * Central helper for routing every "Deposit" call-to-action across the app.
 * - Logged in  → navigate to the wallet/deposit page.
 * - Logged out → show the "connect your wallet first" alert (ConnectFirstDialog),
 *                whose Connect button opens the same WalletPickerModal used by the
 *                header Connect Wallet button.
 *
 * Wiring is event-based so any component can trigger these without prop drilling:
 * - 'cb:connect-first'      → ConnectFirstDialog opens (rendered once in App).
 * - 'cb:open-wallet-picker' → Header opens WalletPickerModal.
 */

export const CONNECT_FIRST_EVENT = 'cb:connect-first';
export const OPEN_WALLET_PICKER_EVENT = 'cb:open-wallet-picker';

/** Show the "please connect your wallet first" alert. */
export function promptConnectFirst() {
  window.dispatchEvent(new Event(CONNECT_FIRST_EVENT));
}

/** Open the wallet-picker popup (the same one tied to the header Connect Wallet button). */
export function openWalletPicker() {
  window.dispatchEvent(new Event(OPEN_WALLET_PICKER_EVENT));
}

/**
 * Handle a Deposit CTA click.
 * @param isLoggedIn whether the user is connected/authenticated
 * @param navigate   wouter navigate function (setLocation)
 */
export function requestDeposit(isLoggedIn: boolean, navigate: (to: string) => void) {
  if (isLoggedIn) {
    sessionStorage.setItem('cupbett_deposit_method', 'wallet');
    sessionStorage.setItem('cupbett_wallet_tab', 'deposit');
    navigate('/account/wallet');
  } else {
    promptConnectFirst();
  }
}
