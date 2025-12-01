
export function setSession(name: string, value: string | object) {
  if (typeof sessionStorage === 'object') {
      var data: string;
      if (typeof value !== 'string') {
          if (value === undefined) {
              data = '';
          } else {
              data = JSON.stringify(value);
          }
      } else {
          data = value;
      }
      sessionStorage.setItem(name, data);
  }
}

export function getSession(name: string): string | object | null {
  if (typeof sessionStorage === 'object') {
      const data = sessionStorage.getItem(name);
      if (data) {
          try {
              return JSON.parse(data || '{}');
          } catch (e) {
              return data;
          }
      }
  }
  return null;
}

export function setLocal(name: string, value: string | object) {
  if (typeof localStorage === 'object') {
      var data: string;
      if (typeof value !== 'string') {
          if (value === undefined) {
              data = '';
          } else {
              data = JSON.stringify(value);
          }
      } else {
          data = value;
      }
      localStorage.setItem(name, data);
  }
}

export function getLocal(name: string): string | object | null {
  if (typeof localStorage === 'object') {
      var data = localStorage.getItem(name);
      try {
          return data ? JSON.parse(data) : null;
      } catch (e) {
          return data;
      }
  }
  return null;
}

export function getLocalString(name: string): string | null {
  if (typeof localStorage === 'object') {
      return localStorage.getItem(name);
  }
  return null;
}

export function removeLocal(name: string) {
  if (typeof localStorage === 'object') {
      localStorage.removeItem(name);
  }
}
export function removeSession(name: string) {
  if (typeof sessionStorage === 'object') {
      sessionStorage.removeItem(name);
  }
}

export function clearLocal() {
  if (typeof localStorage === 'object') {
      localStorage.clear();
  }
}
export function clearSession() {
  if (typeof sessionStorage === 'object') {
      sessionStorage.clear();
  }
}
