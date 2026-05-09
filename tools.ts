import { type Tool } from "@modelcontextprotocol/sdk/types.js";

const CONTACTS_TOOL: Tool = {
    name: "contacts",
    description: "Search and retrieve contacts from Apple Contacts app",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name to search for (optional - if not provided, returns all contacts). Can be partial name to search."
        }
      }
    }
  };
  
  const NOTES_TOOL: Tool = {
    name: "notes", 
    description: "Search, retrieve and create notes in Apple Notes app",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          description: "Operation to perform: 'search', 'list', or 'create'",
          enum: ["search", "list", "create"]
        },
        searchText: {
          type: "string",
          description: "Text to search for in notes (required for search operation)"
        },
        title: {
          type: "string",
          description: "Title of the note to create (required for create operation)"
        },
        body: {
          type: "string",
          description: "Content of the note to create (required for create operation)"
        },
        folderName: {
          type: "string",
          description: "Name of the folder to create the note in (optional for create operation, defaults to 'Claude')"
        }
      },
      required: ["operation"]
    }
  };
  
  const MESSAGES_TOOL: Tool = {
    name: "messages",
    description: "Interact with Apple Messages app - send, read, schedule messages and check unread messages",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          description: "Operation to perform: 'send', 'read', 'schedule', or 'unread'",
          enum: ["send", "read", "schedule", "unread"]
        },
        phoneNumber: {
          type: "string",
          description: "Phone number to send message to (required for send, read, and schedule operations)"
        },
        message: {
          type: "string",
          description: "Message to send (required for send and schedule operations)"
        },
        limit: {
          type: "number",
          description: "Number of messages to read (optional, for read and unread operations)"
        },
        scheduledTime: {
          type: "string",
          description: "ISO string of when to send the message (required for schedule operation)"
        }
      },
      required: ["operation"]
    }
  };
  
  const MAIL_TOOL: Tool = {
    name: "mail",
    description: "Interact with Apple Mail app - read unread emails, search emails, and send emails",
    inputSchema: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          description: "Operation to perform: 'unread', 'search', 'send', 'mailboxes', 'accounts', or 'latest'",
          enum: ["unread", "search", "send", "mailboxes", "accounts", "latest"]
        },
        account: {
          type: "string",
          description: "Email account to use (optional - if not provided, searches across all accounts)"
        },
        mailbox: {
          type: "string",
          description: "Mailbox to use (optional - if not provided, uses inbox or searches across all mailboxes)"
        },
        limit: {
          type: "number",
          description: "Number of emails to retrieve (optional, for unread, search, and latest operations)"
        },
        searchTerm: {
          type: "string",
          description: "Text to search for in emails (required for search operation)"
        },
        to: {
          type: "string",
          description: "Recipient email address (required for send operation)"
        },
        subject: {
          type: "string",
          description: "Email subject (required for send operation)"
        },
        body: {
          type: "string",
          description: "Email body content (required for send operation)"
        },
        cc: {
          type: "string",
          description: "CC email address (optional for send operation)"
        },
        bcc: {
          type: "string",
          description: "BCC email address (optional for send operation)"
        }
      },
      required: ["operation"]
    }
  };
  
const REMINDERS_LIST_TOOL: Tool = {
  name: "reminders_list",
  description: "List reminders from Apple Reminders with an optional filter and list",
  inputSchema: {
    type: "object",
    properties: {
      filter: {
        type: "string",
        description: "Filter preset: today, tomorrow, week, overdue, upcoming, completed, all (optional, default all)",
        enum: ["today", "tomorrow", "week", "overdue", "upcoming", "completed", "all"]
      },
      listName: {
        type: "string",
        description: "Limit results to a specific reminder list (optional)"
      }
    }
  }
};

const REMINDERS_SEARCH_TOOL: Tool = {
  name: "reminders_search",
  description: "Search reminders by text across titles and notes",
  inputSchema: {
    type: "object",
    properties: {
      searchText: {
        type: "string",
        description: "Text to search for in reminder titles and notes"
      }
    },
    required: ["searchText"]
  }
};

const REMINDERS_GET_LISTS_TOOL: Tool = {
  name: "reminders_get_lists",
  description: "List all reminder lists with their titles, IDs, and counts",
  inputSchema: {
    type: "object",
    properties: {}
  }
};

const REMINDERS_CREATE_TOOL: Tool = {
  name: "reminders_create",
  description: "Create a new reminder in Apple Reminders",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the reminder"
      },
      listName: {
        type: "string",
        description: "List to add the reminder to (optional, defaults to Reminders)"
      },
      notes: {
        type: "string",
        description: "Notes for the reminder (optional)"
      },
      dueDate: {
        type: "string",
        description: "Due date in ISO format or natural language e.g. 'tomorrow' (optional)"
      },
      priority: {
        type: "string",
        description: "Priority of the reminder (optional)",
        enum: ["none", "low", "medium", "high"]
      }
    },
    required: ["title"]
  }
};

const REMINDERS_EDIT_TOOL: Tool = {
  name: "reminders_edit",
  description: "Edit an existing reminder by ID",
  inputSchema: {
    type: "object",
    properties: {
      reminderId: {
        type: "string",
        description: "ID of the reminder to edit"
      },
      title: {
        type: "string",
        description: "New title (optional)"
      },
      listName: {
        type: "string",
        description: "Move reminder to this list (optional)"
      },
      notes: {
        type: "string",
        description: "New notes, pass empty string to clear (optional)"
      },
      dueDate: {
        type: "string",
        description: "New due date in ISO format or natural language (optional)"
      },
      priority: {
        type: "string",
        description: "New priority (optional)",
        enum: ["none", "low", "medium", "high"]
      },
      clearDue: {
        type: "boolean",
        description: "Set to true to clear the due date (optional)"
      }
    },
    required: ["reminderId"]
  }
};

const REMINDERS_COMPLETE_TOOL: Tool = {
  name: "reminders_complete",
  description: "Mark a reminder as complete",
  inputSchema: {
    type: "object",
    properties: {
      reminderId: {
        type: "string",
        description: "ID of the reminder to mark complete"
      }
    },
    required: ["reminderId"]
  }
};

const REMINDERS_DELETE_TOOL: Tool = {
  name: "reminders_delete",
  description: "Delete a reminder permanently",
  inputSchema: {
    type: "object",
    properties: {
      reminderId: {
        type: "string",
        description: "ID of the reminder to delete"
      }
    },
    required: ["reminderId"]
  }
};
  
  
const CALENDAR_LIST_EVENTS_TOOL: Tool = {
  name: "calendar_list_events",
  description: "List upcoming calendar events from Apple Calendar app",
  inputSchema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Number of events to retrieve (optional, default 10)"
      },
      fromDate: {
        type: "string",
        description: "Start date in ISO format (optional, default is today)"
      },
      toDate: {
        type: "string",
        description: "End date in ISO format (optional, default is 7 days from now)"
      },
      calendarName: {
        type: "string",
        description: "Name of a specific calendar to list events from (optional, lists from all calendars if not specified)"
      },
      query: {
        type: "string",
        description: "Case-insensitive filter on event title, location, or description (optional)"
      }
    }
  }
};

const CALENDAR_SEARCH_EVENTS_TOOL: Tool = {
  name: "calendar_search_events",
  description: "Search for calendar events by text in titles, locations, and notes",
  inputSchema: {
    type: "object",
    properties: {
      searchText: {
        type: "string",
        description: "Text to search for in event titles, locations, and notes"
      },
      limit: {
        type: "number",
        description: "Number of events to retrieve (optional, default 10)"
      },
      fromDate: {
        type: "string",
        description: "Start date for search range in ISO format (optional, default is today)"
      },
      toDate: {
        type: "string",
        description: "End date for search range in ISO format (optional, default is 30 days from now)"
      },
      calendarName: {
        type: "string",
        description: "Name of a specific calendar to search in (optional, searches all calendars if not specified)"
      }
    },
    required: ["searchText"]
  }
};

const CALENDAR_GET_EVENT_TOOL: Tool = {
  name: "calendar_get_event",
  description: "Get a single calendar event by its ID",
  inputSchema: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "ID of the event to retrieve"
      },
      calendarName: {
        type: "string",
        description: "Name of the calendar (optional, searches all calendars if not specified)"
      }
    },
    required: ["eventId"]
  }
};

const CALENDAR_CREATE_EVENT_TOOL: Tool = {
  name: "calendar_create_event",
  description: "Create a new event in Apple Calendar",
  inputSchema: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Title of the event"
      },
      startDate: {
        type: "string",
        description: "Start date/time of the event in ISO format"
      },
      endDate: {
        type: "string",
        description: "End date/time of the event in ISO format"
      },
      location: {
        type: "string",
        description: "Location of the event (optional)"
      },
      notes: {
        type: "string",
        description: "Additional notes for the event (optional)"
      },
      isAllDay: {
        type: "boolean",
        description: "Whether the event is an all-day event (optional, default is false)"
      },
      calendarName: {
        type: "string",
        description: "Name of the calendar to create the event in (optional, uses default calendar if not specified)"
      }
    },
    required: ["title", "startDate", "endDate"]
  }
};

const CALENDAR_UPDATE_EVENT_TOOL: Tool = {
  name: "calendar_update_event",
  description: "Update an existing calendar event",
  inputSchema: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "ID of the event to update"
      },
      calendarName: {
        type: "string",
        description: "Name of the calendar containing the event"
      },
      title: {
        type: "string",
        description: "New title for the event (optional)"
      },
      startDate: {
        type: "string",
        description: "New start date/time in ISO format (optional)"
      },
      endDate: {
        type: "string",
        description: "New end date/time in ISO format (optional)"
      },
      location: {
        type: "string",
        description: "New location (optional)"
      },
      notes: {
        type: "string",
        description: "New notes (optional)"
      },
      isAllDay: {
        type: "boolean",
        description: "Whether the event is an all-day event (optional)"
      }
    },
    required: ["eventId", "calendarName"]
  }
};

const CALENDAR_DELETE_EVENT_TOOL: Tool = {
  name: "calendar_delete_event",
  description: "Delete a calendar event",
  inputSchema: {
    type: "object",
    properties: {
      eventId: {
        type: "string",
        description: "ID of the event to delete"
      },
      calendarName: {
        type: "string",
        description: "Name of the calendar containing the event"
      }
    },
    required: ["eventId", "calendarName"]
  }
};

const CALENDAR_FREEBUSY_TOOL: Tool = {
  name: "calendar_freebusy",
  description: "Get busy time slots across one or more calendars",
  inputSchema: {
    type: "object",
    properties: {
      fromDate: {
        type: "string",
        description: "Start of range in ISO format"
      },
      toDate: {
        type: "string",
        description: "End of range in ISO format"
      },
      calendarNames: {
        type: "array",
        items: { type: "string" },
        description: "List of calendar names to check (optional, defaults to all calendars)"
      }
    },
    required: ["fromDate", "toDate"]
  }
};

const CALENDAR_LIST_CALENDARS_TOOL: Tool = {
  name: "calendar_list_calendars",
  description: "List all available calendars with their names, sources, and IDs",
  inputSchema: {
    type: "object",
    properties: {}
  }
};
  
const MAPS_TOOL: Tool = {
  name: "maps",
  description: "Search locations, manage guides, save favorites, and get directions using Apple Maps",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Operation to perform with Maps",
        enum: ["search", "save", "directions", "pin", "listGuides", "addToGuide", "createGuide"]
      },
      query: {
        type: "string",
        description: "Search query for locations (required for search)"
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (optional for search)"
      },
      name: {
        type: "string",
        description: "Name of the location (required for save and pin)"
      },
      address: {
        type: "string",
        description: "Address of the location (required for save, pin, addToGuide)"
      },
      fromAddress: {
        type: "string",
        description: "Starting address for directions (required for directions)"
      },
      toAddress: {
        type: "string",
        description: "Destination address for directions (required for directions)"
      },
      transportType: {
        type: "string",
        description: "Type of transport to use (optional for directions)",
        enum: ["driving", "walking", "transit"]
      },
      guideName: {
        type: "string",
        description: "Name of the guide (required for createGuide and addToGuide)"
      }
    },
    required: ["operation"]
  }
};

const tools = [
  CONTACTS_TOOL, NOTES_TOOL, MESSAGES_TOOL, MAIL_TOOL,
  REMINDERS_LIST_TOOL, REMINDERS_SEARCH_TOOL, REMINDERS_GET_LISTS_TOOL,
  REMINDERS_CREATE_TOOL, REMINDERS_EDIT_TOOL, REMINDERS_COMPLETE_TOOL, REMINDERS_DELETE_TOOL,
  CALENDAR_LIST_EVENTS_TOOL, CALENDAR_SEARCH_EVENTS_TOOL, CALENDAR_GET_EVENT_TOOL,
  CALENDAR_CREATE_EVENT_TOOL, CALENDAR_UPDATE_EVENT_TOOL, CALENDAR_DELETE_EVENT_TOOL,
  CALENDAR_FREEBUSY_TOOL, CALENDAR_LIST_CALENDARS_TOOL,
  MAPS_TOOL,
];

export default tools;
