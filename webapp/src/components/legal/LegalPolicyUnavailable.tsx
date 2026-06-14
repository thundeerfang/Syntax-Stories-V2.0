import {
  LEGAL_INLINE_CODE,
  LEGAL_UNAVAILABLE_BODY,
  LEGAL_UNAVAILABLE_TITLE,
} from "./legalUi";
type Props = {
  title: string;
};
export function LegalPolicyUnavailable({ title }: Props) {
  return (
    <div className="space-y-4">
      <h2 className={LEGAL_UNAVAILABLE_TITLE}>{title}</h2>
      <p className={LEGAL_UNAVAILABLE_BODY}>
        Legal content could not be loaded. Set{" "}
        <code className={LEGAL_INLINE_CODE}>NEXT_PUBLIC_API_BASE_URL</code> to
        your API origin (e.g.{" "}
        <code className={LEGAL_INLINE_CODE}>http://localhost:7373</code>) and
        ensure this policy is published (seed or admin).
      </p>
    </div>
  );
}
