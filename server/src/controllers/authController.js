import { createUser, findUserByEmail } from "../models/userModel.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { createToken } from "../utils/token.js";

export async function signup(request, response, next) {
  try {
    const { name, email, password } = request.body;
    // console.log(request.body)

    if (!name || !email || !password) {
      return response.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return response.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await hashPassword(password);
    const user = await createUser({ name, email, password: hashedPassword });
    const token = createToken({ id: user.id, email: user.email });

    return response.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return response.status(400).json({ message: "Email and password are required" });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return response.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      return response.status(401).json({ message: "Invalid credentials" });
    }

    const token = createToken({ id: user.id, email: user.email });

    return response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}
