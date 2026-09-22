/**
 * Re-mounted on every navigation, so each page arrives with the same short
 * entrance (see .ed-route in motion.css). Layout, header and footer stay put.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="ed-route">{children}</div>;
}
