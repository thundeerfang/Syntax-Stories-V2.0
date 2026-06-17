import { LEGAL_UNAVAILABLE_BODY, LEGAL_UNAVAILABLE_TITLE } from "./legalUi";

type Props = {
  title: string;
};

function unavailableMessage(title: string): string {
  switch (title) {
    case "Terms of Service":
      return "No terms and conditions for now.";
    case "Privacy Policy":
      return "No privacy policy for now.";
    case "User Data Deletion":
      return "No user data deletion information for now.";
    default:
      return "No content available for now.";
  }
}

export function LegalPolicyUnavailable({ title }: Props) {
  return (
    <div className="space-y-4">
      <h2 className={LEGAL_UNAVAILABLE_TITLE}>{title}</h2>
      <p className={LEGAL_UNAVAILABLE_BODY}>{unavailableMessage(title)}</p>
    </div>
  );
}
