type ErrorMessagesProps = {
  messages: string[];
};

function ErrorMessages({ messages }: ErrorMessagesProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <ul role="alert">
      {messages.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  );
}

export default ErrorMessages;
