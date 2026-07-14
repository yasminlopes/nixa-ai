'use client';

import { useEffect, useState } from 'react';

const LOCAL_HOSTNAMES = ['localhost', '127.0.0.1', '0.0.0.0'];

export function useIsHosted(): boolean {
  const [isHosted, setIsHosted] = useState(false);

  useEffect(() => {
    setIsHosted(!LOCAL_HOSTNAMES.includes(window.location.hostname));
  }, []);

  return isHosted;
}
