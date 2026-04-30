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
      oauth2: {
        initTokenClient: (config: {
          client_id: string;
          callback: (response: {
            access_token?: string;
            error?: string;
            error_description?: string;
            scope?: string;
          }) => void;
          scope: string;
          prompt?: string;
          login_hint?: string;
          error_callback?: (error: { type?: string }) => void;
        }) => {
          requestAccessToken: () => void;
        };
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
