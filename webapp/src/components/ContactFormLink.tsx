import { CONTACT_FORM_URL } from "@/lib/requestForms";

export function ContactFormLink({ children = "contact form", className }: { children?: React.ReactNode; className?: string }) {
  return <a href={CONTACT_FORM_URL} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>;
}
