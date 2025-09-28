## Database Initialization

We use PostgreSQL with initialization scripts located in `postgres/init`.

### Populator Script

The `populate-db.js` script dynamically populates the database using `data.json`.

- A root-level `package.json` has been added to manage dependencies for the populator script.
- To install dependencies, run:

```bash
npm install
```
