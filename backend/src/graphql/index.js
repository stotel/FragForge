const { buildSchema } = require('graphql');
const { createHandler } = require('graphql-http/lib/use/express');
const Shader = require('../models/Shader');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { scalar } = require('../config/db');
const { broadcast } = require('../events');

const schema = buildSchema(`
  type User { id:ID! username:String! email:String! role:String! is_verified:Boolean! created_at:Float! }
  type Shader { id:ID! title:String! description:String! fragment_code:String! compute_code:String!
    shader_type:String! author_id:ID! author_name:String! is_active:Boolean! views:Int! likes_count:Int!
    tags:[String!]! created_at:Float! updated_at:Float! }
  type Comment { id:ID! shader_id:ID! author_id:ID! author_name:String! content:String! created_at:Float! }
  type ShaderList { shaders:[Shader!]! total:Int! pages:Int! page:Int! }
  type LikeResult { liked:Boolean! }
  type AdminStats { userCount:Int! shaderCount:Int! activeShaderCount:Int! commentCount:Int! verifiedUserCount:Int! }

  type Query {
    shaders(search:String, page:Int, limit:Int): ShaderList!
    shader(id:ID!): Shader
    comments(shaderId:ID!): [Comment!]!
    me: User
    adminStats: AdminStats!
    adminShaders: [Shader!]!
    adminUsers: [User!]!
  }
  type Mutation {
    createShader(title:String! description:String fragment_code:String! compute_code:String shader_type:String tags:[String!]): Shader!
    updateShader(id:ID! title:String! description:String fragment_code:String! compute_code:String shader_type:String tags:[String!]): Shader!
    deleteShader(id:ID!): Boolean!
    setShaderActive(id:ID! is_active:Boolean!): Boolean!
    likeShader(id:ID!): LikeResult!
    addComment(shaderId:ID! content:String!): Comment!
    deleteComment(commentId:ID!): Boolean!
    setUserRole(userId:ID! role:String!): Boolean!
    deleteUser(userId:ID!): Boolean!
  }
`);

function makeRoot(user) {
  const assertAuth = () => { if (!user) throw new Error('Authentication required'); };
  const assertVerified = () => { assertAuth(); if (!user.is_verified) throw new Error('Email verification required'); };
  const assertAdmin = () => { assertAuth(); if (user.role !== 'admin') throw new Error('Admin access required'); };

  return {
    shaders: async ({ search='', page=1, limit=12 }) => {
      const lim = Math.min(limit,50), off=(page-1)*lim;
      const [shaders, total] = await Promise.all([
        Shader.findAll({ search, limit:lim, offset:off, activeOnly:true }),
        Shader.count({ activeOnly:true, search }),
      ]);
      return { shaders, total, pages:Math.ceil(total/lim), page };
    },
    shader: async ({ id }) => {
      const s = await Shader.findById(id);
      if (!s || (!s.is_active && user?.role!=='admin' && user?.id!==s.author_id)) return null;
      await Shader.incrementViews(id);
      return s;
    },
    comments: ({ shaderId }) => Comment.findByShader(shaderId),
    me: () => user||null,
    adminStats: async () => {
      assertAdmin();
      const [userCount,shaderCount,activeShaderCount,commentCount,verifiedUserCount] = await Promise.all([
        User.count(), scalar('SELECT COUNT(*) as c FROM shaders'),
        scalar('SELECT COUNT(*) as c FROM shaders WHERE is_active=1'), Comment.count(),
        scalar('SELECT COUNT(*) as c FROM users WHERE is_verified=1'),
      ]);
      return { userCount,shaderCount,activeShaderCount,commentCount,verifiedUserCount };
    },
    adminShaders: () => { assertAdmin(); return Shader.findAll({ activeOnly:false, limit:200 }); },
    adminUsers: () => { assertAdmin(); return User.findAll({ limit:200 }); },

    createShader: async ({ title, description, fragment_code, compute_code, shader_type, tags }) => {
      assertVerified();
      if (!title?.trim()) throw new Error('Title is required');
      const shader = await Shader.create({ title:title.trim(), description:(description||'').trim(),
        fragment_code:(fragment_code||'').trim(), compute_code:(compute_code||'').trim(),
        shader_type:shader_type||'fragment', author_id:user.id, tags:tags||[] });
      broadcast({ type:'shader_created', shader });
      return shader;
    },
    updateShader: async ({ id, title, description, fragment_code, compute_code, shader_type, tags }) => {
      assertVerified();
      const s = await Shader.findById(id);
      if (!s) throw new Error('Not found');
      if (s.author_id!==user.id && user.role!=='admin') throw new Error('Forbidden');
      return Shader.update(id, { title, description, fragment_code, compute_code, shader_type, tags });
    },
    deleteShader: async ({ id }) => {
      assertVerified();
      const s = await Shader.findById(id);
      if (!s) throw new Error('Not found');
      if (s.author_id!==user.id && user.role!=='admin') throw new Error('Forbidden');
      await Shader.delete(id); broadcast({ type:'shader_deleted', id }); return true;
    },
    setShaderActive: async ({ id, is_active }) => {
      assertAdmin(); await Shader.setActive(id, is_active);
      broadcast({ type:is_active?'shader_activated':'shader_deactivated', id });
      if (is_active) broadcast({ type:'shader_created', shader: await Shader.findById(id) });
      return true;
    },
    likeShader: async ({ id }) => { assertVerified(); return Shader.toggleLike(user.id, id); },
    addComment: async ({ shaderId, content }) => {
      assertVerified();
      if (!content?.trim()) throw new Error('Content required');
      return Comment.create({ shader_id:shaderId, author_id:user.id, content:content.trim() });
    },
    deleteComment: async ({ commentId }) => {
      assertVerified();
      const c = await Comment.findById(commentId);
      if (!c) throw new Error('Not found');
      if (c.author_id!==user.id && user.role!=='admin') throw new Error('Forbidden');
      await Comment.delete(commentId); return true;
    },
    setUserRole: async ({ userId, role }) => {
      assertAdmin();
      if (!['user','admin'].includes(role)) throw new Error('Invalid role');
      await User.updateRole(userId, role); return true;
    },
    deleteUser: async ({ userId }) => { assertAdmin(); await User.delete(userId); return true; },
  };
}

const handler = createHandler({
  schema,
  rootValue: (req) => makeRoot(req.raw.user),
});

module.exports = { handler };
