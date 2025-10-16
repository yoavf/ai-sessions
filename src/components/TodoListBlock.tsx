"use client";

interface Todo {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm: string;
}

interface TodoListBlockProps {
  todos: Todo[];
}

export default function TodoListBlock({ todos }: TodoListBlockProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">Todo List</span>
          <span className="text-xs text-gray-500">
            ({todos.filter((t) => t.status === "completed").length}/
            {todos.length} completed)
          </span>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {todos.map((todo) => (
          <div
            key={todo.content}
            className={`px-4 py-3 flex items-start gap-3 ${
              todo.status === "completed" ? "bg-green-50" : ""
            } ${todo.status === "in_progress" ? "bg-blue-50" : ""}`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {todo.status === "completed" && (
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {todo.status === "in_progress" && (
                <svg
                  className="w-5 h-5 text-blue-600 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {todo.status === "pending" && (
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm ${
                  todo.status === "completed"
                    ? "text-green-900 line-through"
                    : "text-gray-900"
                }`}
              >
                {todo.content}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
