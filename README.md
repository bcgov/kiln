# KILN

KILN is a presenter tool for FORMS. This accepts a JSON and present it as form with dynamic CARBON/React components.

It is developed using Carbon/React + TypeScript + Vite

## Setup Instructions

### Dependencies

- npm version 10.2.4 or higher
- node.js 20.11.1 or higher

### Installation

- Clone the repository:

```
git clone https://github.com/bcgov/kiln.git

```

- Install the Node Modules

```
npm install
```

- Once install is done, copy .env.example to .env and update it with real values

```
cp .env.example .env

### Docker Deployment 

Have Docker installed and running. Run the following commands for local deployment:

```
docker-compose up --build

```

### Executing program (Not valid anymore)

- From the command line, start the server

```
npm run build
npm run preview
```
