import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();

vi.mock('../src/lib/api', () => ({
  default: {
    get: (...args) => get(...args),
    post: (...args) => post(...args),
    patch: (...args) => patch(...args),
    delete: (...args) => del(...args)
  }
}));

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }) => (
    <button onClick={() => onSuccess({ credential: 'google-credential' })}>Continue with Google</button>
  )
}));

const { App } = await import('../src/pages/App');

const CONVERSATIONS = [
  { _id: 'c1', title: 'Trip planning' },
  { _id: 'c2', title: 'Debugging' }
];

/**
 * Builds a fetch Response whose body streams the given SSE chunks. With `gate`
 * the stream stays open until it resolves, so assertions can run mid-stream
 * before the component reloads messages from the server.
 */
function sseResponse(chunks, gate) {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    body: {
      getReader: () => ({
        read: async () => {
          if (index < chunks.length) return { value: encoder.encode(chunks[index++]), done: false };
          if (gate) await gate;
          return { done: true };
        }
      })
    }
  };
}

/** Header action buttons (theme, regenerate, share) in DOM order. */
function headerIconButtons() {
  return within(document.querySelector('header'))
    .getAllByRole('button')
    .filter((button) => button.className.includes('p-2'));
}

function mockRestEndpoints() {
  get.mockImplementation(async (url) => {
    if (url === '/auth/me') return { data: { user: { email: 'jack@example.com' } } };
    if (url === '/conversations') return { data: { conversations: CONVERSATIONS } };
    if (url.endsWith('/messages')) return { data: { messages: [{ _id: 'm1', role: 'user', content: 'hi' }] } };
    throw new Error(`unexpected GET ${url}`);
  });
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
  del.mockReset();
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('App authentication gate', () => {
  it('shows the auth panel when no token is stored and never calls the API', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'ChatGPT Clone' })).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it('persists the token from a successful sign in and loads the chat shell', async () => {
    post.mockResolvedValue({ data: { token: 'jwt-123' } });
    mockRestEndpoints();
    render(<App />);

    await userEvent.type(screen.getByPlaceholderText('Email'), 'jack@example.com');
    await userEvent.type(screen.getByPlaceholderText('Password'), 'hunter2');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(post).toHaveBeenCalledWith('/auth/signin', {
      name: '',
      email: 'jack@example.com',
      password: 'hunter2'
    });
    expect(localStorage.getItem('auth_token')).toBe('jwt-123');
    expect(await screen.findByText('Logged in as jack@example.com')).toBeInTheDocument();
  });

  it('routes sign up to the signup endpoint', async () => {
    post.mockResolvedValue({ data: { token: 'jwt-new' } });
    mockRestEndpoints();
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    await userEvent.type(screen.getByPlaceholderText('Name'), 'Jack');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(post).toHaveBeenCalledWith('/auth/signup', expect.objectContaining({ name: 'Jack' }));
  });

  it('exchanges a google credential for a token', async () => {
    post.mockResolvedValue({ data: { token: 'jwt-google' } });
    mockRestEndpoints();
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(post).toHaveBeenCalledWith('/auth/google', { idToken: 'google-credential' });
    expect(await screen.findByText('Logged in as jack@example.com')).toBeInTheDocument();
  });
});

describe('App conversation list', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'jwt-123');
    mockRestEndpoints();
  });

  it('loads conversations, selects the first one and shows its messages', async () => {
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Trip planning' })).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledWith('/conversations/c1/messages'));
    expect(screen.getByRole('heading', { name: 'Trip planning' })).toBeInTheDocument();
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('prepends a created conversation and makes it current', async () => {
    post.mockResolvedValue({ data: { conversation: { _id: 'c3', title: 'New conversation' } } });
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    await userEvent.click(screen.getByRole('button', { name: /New chat/ }));

    expect(post).toHaveBeenCalledWith('/conversations', { title: 'New conversation' });
    await waitFor(() => expect(get).toHaveBeenCalledWith('/conversations/c3/messages'));
  });

  it('renames a conversation with the prompted title', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('Renamed');
    patch.mockResolvedValue({ data: { conversation: { _id: 'c1', title: 'Renamed' } } });
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    await userEvent.click(screen.getAllByRole('button', { name: 'Rename' })[0]);

    expect(patch).toHaveBeenCalledWith('/conversations/c1', { title: 'Renamed' });
    expect(await screen.findByRole('button', { name: 'Renamed' })).toBeInTheDocument();
  });

  it('does not call the API when the rename prompt is cancelled', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    await userEvent.click(screen.getAllByRole('button', { name: 'Rename' })[0]);

    expect(patch).not.toHaveBeenCalled();
  });

  it('removes a deleted conversation from the sidebar', async () => {
    del.mockResolvedValue({});
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    const trashButtons = screen
      .getAllByRole('button')
      .filter((button) => button.textContent === '' && button.querySelector('svg'));
    await userEvent.click(trashButtons[0]);

    expect(del).toHaveBeenCalledWith('/conversations/c1');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Trip planning' })).not.toBeInTheDocument());
  });

  it('opens and closes the settings modal', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    await userEvent.click(screen.getByRole('button', { name: /Settings/ }));
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('heading', { name: 'Settings' })).not.toBeInTheDocument();
  });
});

describe('App streaming', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'jwt-123');
    mockRestEndpoints();
  });

  it('appends streamed tokens to the assistant bubble and reloads afterwards', async () => {
    let endStream;
    const gate = new Promise((resolve) => {
      endStream = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(sseResponse(['data: {"token":"Hel"}\n\n', 'data: {"token":"lo"}\n\n'], gate));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    await userEvent.type(screen.getByPlaceholderText('Message AI...'), 'ping');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:4000/api/conversations/c1/messages/stream');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer jwt-123');
    expect(JSON.parse(options.body)).toEqual({ content: 'ping' });

    expect(await screen.findByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('AI is typing…')).toBeInTheDocument();

    endStream();

    // Conversation list and messages are refreshed once the stream completes.
    await waitFor(() => expect(get.mock.calls.filter(([u]) => u === '/conversations').length).toBe(2));
    await waitFor(() => expect(screen.queryByText('AI is typing…')).not.toBeInTheDocument());
  });

  it('reassembles tokens split across chunk boundaries and ignores non-data lines', async () => {
    const gate = new Promise(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(sseResponse([': keep-alive\n\ndata: {"token":"a', 'b"}\n\n'], gate))
    );
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    await userEvent.type(screen.getByPlaceholderText('Message AI...'), 'ping');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('ab')).toBeInTheDocument();
  });

  it('creates a conversation first when none is selected', async () => {
    get.mockImplementation(async (url) => {
      if (url === '/auth/me') return { data: { user: { email: 'jack@example.com' } } };
      if (url === '/conversations') return { data: { conversations: [] } };
      return { data: { messages: [] } };
    });
    post.mockResolvedValue({ data: { conversation: { _id: 'new-c', title: 'New conversation' } } });
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(['data: {"done":true}\n\n']));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByPlaceholderText('Message AI...');

    await userEvent.type(screen.getByPlaceholderText('Message AI...'), 'first message');
    await userEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(post).toHaveBeenCalledWith('/conversations', { title: 'New conversation' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  });

  it('regenerates by resending the last user message', async () => {
    post.mockResolvedValue({ data: {} });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse(['data: {"done":true}\n\n'])));
    render(<App />);
    await screen.findByText('hi');

    const [, regenerateButton] = headerIconButtons();
    await userEvent.click(regenerateButton);

    await waitFor(() => expect(post).toHaveBeenCalledWith('/conversations/c1/regenerate'));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ content: 'hi' });
  });
});

describe('App share and export', () => {
  beforeEach(() => {
    localStorage.setItem('auth_token', 'jwt-123');
    mockRestEndpoints();
  });

  it('copies a share link to the clipboard', async () => {
    post.mockResolvedValue({ data: { sharedToken: 'share-token' } });
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    vi.stubGlobal('alert', vi.fn());
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    await userEvent.click(headerIconButtons()[2]);

    await waitFor(() => expect(post).toHaveBeenCalledWith('/conversations/c1/share'));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/shared/share-token`);
    expect(alert).toHaveBeenCalledWith('Share link copied to clipboard');
  });

  it('downloads a markdown export named after the conversation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => '## user\n\nhi' }));
    const createObjectURL = vi.fn(() => 'blob:url');
    vi.stubGlobal('URL', { ...URL, createObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    await userEvent.click(screen.getByRole('button', { name: 'Export MD' }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(fetch.mock.calls[0][0]).toBe('http://localhost:4000/api/conversations/c1/export?format=md');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-123');
    expect(createObjectURL.mock.calls[0][0].type).toBe('text/markdown');
    expect(click).toHaveBeenCalled();
  });

  it('exports JSON with a json blob type', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => '{}' }));
    const createObjectURL = vi.fn(() => 'blob:url');
    vi.stubGlobal('URL', { ...URL, createObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    await userEvent.click(screen.getByRole('button', { name: 'Export JSON' }));

    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(fetch.mock.calls[0][0]).toContain('format=json');
    expect(createObjectURL.mock.calls[0][0].type).toBe('application/json');
  });

  it('does nothing for regenerate or share when no conversation is selected', async () => {
    get.mockImplementation(async (url) =>
      url === '/auth/me'
        ? { data: { user: { email: 'jack@example.com' } } }
        : { data: { conversations: [] } }
    );
    render(<App />);
    await screen.findByPlaceholderText('Message AI...');

    const [, regenerateButton, shareButton] = headerIconButtons();
    await userEvent.click(regenerateButton);
    await userEvent.click(shareButton);

    expect(post).not.toHaveBeenCalled();
  });

  it('names the export file "conversation" when the title is unknown', async () => {
    get.mockImplementation(async (url) =>
      url === '/auth/me'
        ? { data: { user: { email: 'jack@example.com' } } }
        : { data: { conversations: [] } }
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ text: async () => '{}' }));
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:url') });
    let downloadName;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      downloadName = this.download;
    });
    render(<App />);
    await screen.findByPlaceholderText('Message AI...');

    await userEvent.click(screen.getByRole('button', { name: 'Export JSON' }));

    await waitFor(() => expect(downloadName).toBe('conversation.json'));
  });

  it('toggles the theme from the header', async () => {
    render(<App />);
    await screen.findByRole('button', { name: 'Trip planning' });

    await userEvent.click(headerIconButtons()[0]);

    expect(localStorage.getItem('theme')).toBe('light');
  });
});
