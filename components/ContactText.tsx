/** A phone number: an optional "+", then digits with spaces, dots, dashes or brackets, ending on a digit. */
const PHONE = /(\+?\d[\d\s().-]{5,}\d)/;

/**
 * A contact as typed, with each phone number kept on one line (whitespace-nowrap) so it never
 * wraps mid-number. The text is unchanged; only line breaks inside a number are prevented.
 */
export default function ContactText({ contact }: { contact: string }) {
  return (
    <>
      {contact.split(PHONE).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="whitespace-nowrap" data-phone>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}
