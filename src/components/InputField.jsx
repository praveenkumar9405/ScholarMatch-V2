export const InputField = ({ label, type = 'text', name, value, onChange, placeholder, required = false, options = [] }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <label className="text-sm font-medium text-text/80 ml-1">{label} {required && <span className="text-primary">*</span>}</label>
      {type === 'select' ? (
        <select
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-sm appearance-none"
        >
          <option value="" disabled>{placeholder || 'Select an option'}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-sm"
        />
      )}
    </div>
  );
};
