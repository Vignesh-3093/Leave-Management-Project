// import { Router } from "express";
// import { ManagerController } from "../controllers/managerController";
// import protect from "../middleware/authMiddleware";
// import { authorizeRole } from "../middleware/roleMiddleware"; // Assuming authorizeRole is a named export factory

// const router = Router();
// const managerController = new ManagerController(); // Create an instance of the controller

// router.use(protect); // This line should now work with the corrected protect signature

// router.use(authorizeRole(['Manager','Admin']));

// router.get("/pending-requests", managerController.getPendingLeaveRequests);

// export { router }; // Export the router instance

import { Router, Request, Response, NextFunction } from "express";
import { ManagerController } from "../controllers/managerController";
import protect from "../middleware/authMiddleware";
import { authorizeRole } from "../middleware/roleMiddleware";

const router = Router();
const managerController = new ManagerController();

router.use((req: Request, res: Response, next: NextFunction) => {
  console.log("Manager Router hit:", req.method, req.url);
  next();
});

router.use(protect);
router.use(authorizeRole(["manager", "admin"]));

router.get("/pending-requests", managerController.getPendingLeaveRequests);

export { router };
