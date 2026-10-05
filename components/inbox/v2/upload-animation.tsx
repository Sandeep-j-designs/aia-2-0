import { Check, FileText, Inbox, ArrowRight, AlertCircle } from "@/components/icons";
import s from "./upload-animation.module.css";

type Props = {
  uploaded: number;
  total: number;
  failed: number;
  active: boolean;
};

export default function UploadAnimation({
  uploaded,
  total,
  failed,
  active,
}: Props) {
  const complete = uploaded + failed === total;
  const success = complete && failed === 0;
  return (
    <div
      className={s.root}
      data-active={active && !complete}
      data-success={success}
    >
      <div className={s.scene} aria-hidden="true">
        <div className={s.halo} />
        <div className={s.source}>
          <div className={s.backSheet} />
          <div className={s.sheet}>
            <FileText size={20} />
            <i />
            <i />
            <span>DOCUMENTS</span>
          </div>
        </div>
        <div className={s.route}>
          <span />
          <span />
          <span />
          <ArrowRight size={16} />
        </div>
        <div className={s.traveling}>
          <FileText size={19} />
        </div>
        <div className={s.destination}>
          <Inbox size={34} strokeWidth={1.4} />
          {complete && (
            <span className={s.badge}>
              {success ? <Check size={13} /> : <AlertCircle size={13} />}
            </span>
          )}
        </div>
      </div>
      <div className={s.summary}>
        <div>
          <strong>
            {uploaded}
            <span> / {total}</span>
          </strong>
          <span className={s.label}>documents uploaded</span>
        </div>
        <span className={s.status} role="status" aria-live="polite">
          {success
            ? "Ready for your inbox"
            : complete
              ? // Named for what happened, not for what it asks of the
                // reader: "need attention" is a prompt, and the failure list
                // right below is already the prompt.
                `${failed} Failed`
              : "AI Accountant prepares every document"}
        </span>
      </div>
      <div
        className={s.track}
        role="progressbar"
        aria-label="Upload progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={uploaded}
      >
        <span style={{ width: `${total ? (uploaded / total) * 100 : 0}%` }} />
      </div>
    </div>
  );
}
