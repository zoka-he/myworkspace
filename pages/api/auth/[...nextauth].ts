import NextAuth, { AuthOptions } from "next-auth";
import fetch from '@/src/fetch';
import CredentialsProvider from "next-auth/providers/credentials";
import { ILoginUser } from "@/src/utils/auth/ILoginUser";
import { NextApiRequest, NextApiResponse } from "next";
import LoginAccountService from '@/src/services/user/loginAccountService';
import AUTH_SECRET from '@/src/utils/auth/secret.json';

const loginAccountService = new LoginAccountService();

export const authOptions: AuthOptions = {
    session: {
        strategy: 'jwt'
    },
    pages: {
        signIn: '/login'
    },
    secret: AUTH_SECRET,
    providers: [
        CredentialsProvider({
            name: 'login',
            credentials: {},
            async authorize(credentials: any, req) {
                console.debug('[[...nextauth].ts] authorize:', credentials);

                const user = await loginAccountService.verifyUser(credentials?.payload || '');
                if (user) {
                    return {
                        id: '' + user.ID,
                        name: user.nickname,
                    }
                } else {
                    // Return null if user data could not be retrieved
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async signIn({ user }) {
            console.debug('signIn callback', user);

            if (!user) {
                return false;
            }

            return true;
        },

        async jwt({ token, user }) {
            // user is obj that we have received from authorize Promise.resolve(user)
            user && (token.user = user);
            // not this token has user property
            return Promise.resolve(token);
        },

        async session({ session, token, user }) {
            // @ts-ignore
            session.user = token.user;
            
            return Promise.resolve(session);
        }
    },
    events: {},
    theme: {colorScheme: "light"},
    debug: false,
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    return NextAuth(req, res, authOptions);
}



