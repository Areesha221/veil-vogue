import validator from 'validator';

export const isNonEmptyString = (v, max = 500) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
export const toTrimmedString = (v) => (typeof v === 'string' ? v.trim() : '');

export const validateEmail = (email) => isNonEmptyString(email, 254) && validator.isEmail(String(email).trim());
export const validatePassword = (password) => typeof password === 'string' && password.length >= 6 && password.length <= 128;
export const validatePhone = (phone) => {
  if (phone == null || phone === '') return true; // optional in some forms
  const s = String(phone).trim();
  return /^[0-9+\-\s()]{7,20}$/.test(s);
};

export const sanitizeOrderItem = (item) => {
  if (!item || typeof item !== 'object') return null;
  const name = toTrimmedString(item.name);
  const quantity = Number(item.quantity);
  const price = Number(item.price);
  const product = item.product ? String(item.product) : '';
  const image = toTrimmedString(item.image || '');
  if (!name || !product || !Number.isFinite(quantity) || quantity < 1 || quantity > 100 || !Number.isFinite(price) || price < 0) {
    return null;
  }
  return {
    name: name.slice(0, 200),
    quantity: Math.floor(quantity),
    image: image.slice(0, 1000),
    price,
    product,
    ...(item.variant ? { variant: toTrimmedString(item.variant).slice(0, 100) } : {})
  };
};

export const validateShippingAddress = (addr = {}) => {
  const required = ['fullName', 'phone', 'street', 'city', 'state'];
  for (const f of required) {
    if (!isNonEmptyString(addr[f], 200)) return { ok: false, message: `Shipping ${f} is required` };
  }
  if (!validatePhone(addr.phone)) return { ok: false, message: 'Invalid shipping phone number' };
  return {
    ok: true,
    value: {
      fullName: toTrimmedString(addr.fullName).slice(0, 120),
      phone: toTrimmedString(addr.phone).slice(0, 30),
      street: toTrimmedString(addr.street).slice(0, 300),
      city: toTrimmedString(addr.city).slice(0, 120),
      state: toTrimmedString(addr.state).slice(0, 120),
      zip: toTrimmedString(addr.zip || '').slice(0, 30),
      country: toTrimmedString(addr.country || 'Pakistan').slice(0, 80) || 'Pakistan'
    }
  };
};