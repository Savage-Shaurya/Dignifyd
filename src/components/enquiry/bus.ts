// Tiny event bus so the navbar / footer CTAs can start the enquiry flow in the audit section.
export type EnquiryPreset = { preset?: string; note?: string };

const EVT = "dg:enquiry";

export function openEnquiry(detail: EnquiryPreset = {}) {
  window.dispatchEvent(new CustomEvent<EnquiryPreset>(EVT, { detail }));
}

export function onEnquiry(cb: (d: EnquiryPreset) => void) {
  const h = (e: Event) => cb((e as CustomEvent<EnquiryPreset>).detail);
  window.addEventListener(EVT, h);
  return () => window.removeEventListener(EVT, h);
}
