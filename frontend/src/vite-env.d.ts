/// <reference types="vite/client" />

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
        }) => void;
        renderButton: (
          parent: HTMLElement,
          options: {
            theme?: string;
            size?: string;
            shape?: string;
            text?: string;
            width?: number | string;
          },
        ) => void;
        prompt: () => void;
      };
    };
    maps?: {
      places?: {
        Autocomplete: new (
          inputField: HTMLInputElement,
          options?: {
            fields?: string[];
            types?: string[];
          },
        ) => {
          addListener: (eventName: string, handler: () => void) => void;
          getPlace: () => any;
        };
      };
    };
  };
}
