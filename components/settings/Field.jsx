// components/settings/Field.jsx

export default function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm font-medium text-fp-text-secondary block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}