# Responsive Design

## Target devices

The learner experience must work on:

- phones;
- tablets;
- tablet landscape;
- laptops/desktops.

## Product principle

Responsive design is part of learning design. A learner should not have to fight the interface while trying to retrieve information.

## Current priorities

Protect:

- readable content width;
- touch-friendly controls;
- predictable navigation;
- usable micro-topic cards;
- practice question readability;
- progress/revision controls;
- landscape tablet layout;
- PWA/install affordances.

## Mobile navigation

The current `app.js` contains a single-source mobile navigation handler. It opens/closes the navigation, updates accessibility attributes and closes the menu after navigation or outside interaction.

Do not introduce a second competing menu handler.

## Content hierarchy

On small screens, preserve the learning hierarchy rather than merely shrinking desktop layouts:

**Unit → Topic → Micro-topic → Learning → Retrieval → Practice**

## Home page

The Home page is treated as an established design baseline. Unrelated architectural work must not redesign it.

## Testing

At minimum, responsive changes should be checked at:

- narrow phone width;
- typical phone width;
- tablet portrait;
- tablet landscape;
- laptop width.

Do not fix a hypothetical breakpoint if the existing layout already works.
